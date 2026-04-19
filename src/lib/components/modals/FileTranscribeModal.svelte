<script lang="ts">
	import { onDestroy } from 'svelte';
	import { _ } from 'svelte-i18n';
	import {
		toJson,
		toTxt,
		defaultExportName,
		type TranscriptSegment,
		type TranscriptResult
	} from '$lib/transcriptExport';

	interface SpeechEditorApi {
		insertStreamingText: (event: {
			text: string;
			isFinal: boolean;
			start?: number;
			end?: number;
		}) => void;
		signalVadSpeechEnd: () => void;
		saveState?: () => Promise<boolean> | boolean;
		startTiming?: () => void;
		stopTiming?: () => void;
	}

	interface Props {
		open: boolean;
		speechEditor?: SpeechEditorApi | null;
		ensureSession?: (suggestedName?: string) => Promise<string | null>;
		onClose?: () => void;
	}

	let { open = $bindable(false), speechEditor = null, ensureSession, onClose }: Props = $props();

	type Phase = 'idle' | 'probing' | 'ready' | 'running' | 'done' | 'error' | 'cancelled';

	let phase = $state<Phase>('idle');
	let filePath = $state<string | null>(null);
	let durationSec = $state(0);
	let channelCount = $state(1);
	let sampleRate = $state(0);
	let codec = $state('');
	let sizeBytes = $state(0);
	let splitChannels = $state(true);
	let showTimestamps = $state(true);
	let segments = $state<TranscriptSegment[]>([]);
	let progressByChannel = $state<Record<number, { processedSec: number; totalSec: number }>>({});
	let currentJobId = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let savingState = $state(false);
	let listenersBound = false;
	let periodicSaveTimer: ReturnType<typeof setInterval> | null = null;
	const PERIODIC_SAVE_MS = 15000;

	function streamSegmentIntoEditor(seg: TranscriptSegment, showCh: boolean) {
		if (!speechEditor) return;
		const prefix = showCh ? `[Ch${seg.channel}] ` : '';
		const text = (prefix + seg.text).trim();
		if (!text) return;
		try {
			speechEditor.insertStreamingText({
				text: text + ' ',
				isFinal: true,
				start: seg.start,
				end: seg.end
			});
			speechEditor.signalVadSpeechEnd();
		} catch (err) {
			console.error('[FileTranscribe] Failed to stream segment to editor:', err);
		}
	}

	async function persistEditorState() {
		if (!speechEditor?.saveState) return;
		try {
			savingState = true;
			await speechEditor.saveState();
		} catch (err) {
			console.error('[FileTranscribe] Failed to persist editor state:', err);
		} finally {
			savingState = false;
		}
	}

	function startPeriodicSave() {
		stopPeriodicSave();
		periodicSaveTimer = setInterval(() => {
			void persistEditorState();
		}, PERIODIC_SAVE_MS);
	}

	function stopPeriodicSave() {
		if (periodicSaveTimer) {
			clearInterval(periodicSaveTimer);
			periodicSaveTimer = null;
		}
	}

	function bindListeners() {
		if (listenersBound) return;
		listenersBound = true;

		window.fileTranscribe.onSegment((msg) => {
			const seg: TranscriptSegment = {
				text: msg.text,
				start: msg.start,
				end: msg.end,
				channel: msg.channel
			};
			segments = [...segments, seg];
			streamSegmentIntoEditor(seg, splitChannels && channelCount > 1);
		});
		window.fileTranscribe.onProgress((msg) => {
			progressByChannel = {
				...progressByChannel,
				[msg.channel]: { processedSec: msg.processedSec, totalSec: msg.totalSec }
			};
		});
		window.fileTranscribe.onDone(async (msg) => {
			if (msg.cancelled) {
				phase = 'cancelled';
			} else {
				phase = 'done';
				segments = msg.segments;
			}
			currentJobId = null;
			stopPeriodicSave();
			try { speechEditor?.stopTiming?.(); } catch (_) { /* ignore */ }
			await persistEditorState();
		});
		window.fileTranscribe.onError(async (msg) => {
			phase = 'error';
			errorMessage = msg.message;
			currentJobId = null;
			stopPeriodicSave();
			try { speechEditor?.stopTiming?.(); } catch (_) { /* ignore */ }
			await persistEditorState();
		});
	}

	onDestroy(() => {
		stopPeriodicSave();
		if (listenersBound) {
			window.fileTranscribe.removeAllListeners();
			listenersBound = false;
		}
	});

	$effect(() => {
		if (open) {
			bindListeners();
		}
	});

	function resetState() {
		phase = 'idle';
		filePath = null;
		durationSec = 0;
		channelCount = 1;
		sampleRate = 0;
		codec = '';
		sizeBytes = 0;
		segments = [];
		progressByChannel = {};
		currentJobId = null;
		errorMessage = null;
	}

	async function pickFile() {
		const picked = await window.fileTranscribe.pickAudio();
		if (!picked) return;
		filePath = picked;
		phase = 'probing';
		errorMessage = null;
		segments = [];
		progressByChannel = {};
		try {
			const info = await window.fileTranscribe.probe(picked);
			if (!info.success) {
				errorMessage = info.error || $_('fileTranscribe.unknownError');
				phase = 'error';
				return;
			}
			durationSec = info.durationSec ?? 0;
			channelCount = info.channels ?? 1;
			sampleRate = info.sampleRate ?? 0;
			codec = info.codec ?? '';
			sizeBytes = info.sizeBytes ?? 0;
			splitChannels = channelCount > 1;
			phase = 'ready';
		} catch (err: any) {
			errorMessage = err?.message || String(err);
			phase = 'error';
		}
	}

	async function startTranscription() {
		if (!filePath) return;
		if (!speechEditor) {
			errorMessage = $_('fileTranscribe.noActiveEditor');
			phase = 'error';
			return;
		}

		if (ensureSession) {
			const suggestedName = filePath.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '');
			try {
				const sid = await ensureSession(suggestedName);
				if (!sid) {
					errorMessage = $_('fileTranscribe.noActiveEditor');
					phase = 'error';
					return;
				}
			} catch (err: any) {
				errorMessage = err?.message || String(err);
				phase = 'error';
				return;
			}
		}

		const channelsToProcess =
			splitChannels && channelCount > 1
				? Array.from({ length: channelCount }, (_, i) => i)
				: [0];
		segments = [];
		progressByChannel = {};
		errorMessage = null;
		phase = 'running';

		try {
			speechEditor.signalVadSpeechEnd();
			speechEditor.startTiming?.();
		} catch (err) {
			console.warn('[FileTranscribe] Editor prep warning:', err);
		}

		const res = await window.fileTranscribe.start({
			filePath,
			channelsToProcess,
			totalChannels: splitChannels ? channelCount : 1,
			durationSec
		});
		if (!res.success) {
			errorMessage = res.error || $_('fileTranscribe.unknownError');
			phase = 'error';
			return;
		}
		currentJobId = res.jobId ?? null;
		startPeriodicSave();
	}

	async function cancelTranscription() {
		if (!currentJobId) return;
		await window.fileTranscribe.cancel(currentJobId);
	}

	async function exportAs(format: 'json' | 'txt') {
		if (!filePath || segments.length === 0) return;
		const result: TranscriptResult = {
			source: filePath,
			durationSec,
			channelCount: splitChannels ? channelCount : 1,
			segments
		};
		const content =
			format === 'json'
				? toJson(result)
				: toTxt(result, { timestamps: showTimestamps });
		const defaultName = defaultExportName(filePath, format);
		await window.fileTranscribe.exportTranscript({ defaultName, content });
	}

	function formatTime(seconds: number): string {
		const s = Math.max(0, Math.floor(seconds));
		const h = Math.floor(s / 3600);
		const m = Math.floor((s % 3600) / 60);
		const sec = s % 60;
		return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
	}

	function formatBytes(bytes: number): string {
		if (!bytes) return '';
		const mb = bytes / 1024 / 1024;
		if (mb >= 1000) return `${(mb / 1024).toFixed(1)} GB`;
		return `${mb.toFixed(1)} MB`;
	}

	let overallProgressPct = $derived.by(() => {
		if (phase !== 'running' || durationSec === 0) return 0;
		const channelEntries = Object.values(progressByChannel);
		if (channelEntries.length === 0) return 0;
		const channelsExpected = splitChannels && channelCount > 1 ? channelCount : 1;
		const totalProcessed = channelEntries.reduce((acc, p) => acc + p.processedSec, 0);
		const totalWork = durationSec * channelsExpected;
		if (totalWork === 0) return 0;
		return Math.min(100, Math.round((totalProcessed / totalWork) * 100));
	});

	function handleClose() {
		if (phase === 'running') {
			cancelTranscription();
		}
		resetState();
		open = false;
		onClose?.();
	}
</script>

{#if open}
	<div class="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="file-transcribe-title">
		<div class="modal-box w-11/12 max-w-2xl max-h-[90vh] flex flex-col">
			<div class="flex items-start justify-between mb-4">
				<h2 id="file-transcribe-title" class="font-bold text-lg">{$_('fileTranscribe.title')}</h2>
				<button class="btn btn-sm btn-ghost" onclick={handleClose} aria-label={$_('common.close')}>✕</button>
			</div>

			<div class="flex-1 overflow-y-auto">
				{#if phase === 'idle' || phase === 'probing'}
					<div class="text-center py-8">
						<button
							class="btn btn-primary"
							onclick={pickFile}
							disabled={phase === 'probing'}
						>
							{phase === 'probing' ? $_('fileTranscribe.reading') : $_('fileTranscribe.chooseFile')}
						</button>
						<p class="text-sm opacity-70 mt-3">
							{$_('fileTranscribe.supportedFormats')}
						</p>
					</div>
				{/if}

				{#if phase !== 'idle' && phase !== 'probing' && filePath}
					<div class="bg-base-200 p-3 rounded mb-4 text-sm space-y-1">
						<div class="break-all"><span class="opacity-70">{filePath}</span></div>
						<div>
							<span class="opacity-70">{$_('fileTranscribe.duration')}:</span> {formatTime(durationSec)} ·
							<span class="opacity-70">{$_('fileTranscribe.channels')}:</span> {channelCount} ·
							<span class="opacity-70">{$_('fileTranscribe.sampleRate')}:</span> {sampleRate} Hz ·
							<span class="opacity-70">{$_('fileTranscribe.codec')}:</span> {codec}
							{#if sizeBytes}· <span class="opacity-70">{$_('fileTranscribe.size')}:</span> {formatBytes(sizeBytes)}{/if}
						</div>
					</div>
				{/if}

				{#if phase === 'ready'}
					<div class="space-y-3">
						{#if channelCount > 1}
							<label class="label cursor-pointer justify-start gap-3">
								<input type="checkbox" class="checkbox" bind:checked={splitChannels} />
								<span>{$_('fileTranscribe.splitChannels', { values: { count: channelCount } })}</span>
							</label>
						{/if}
						<label class="label cursor-pointer justify-start gap-3">
							<input type="checkbox" class="checkbox" bind:checked={showTimestamps} />
							<span>{$_('fileTranscribe.includeTimestamps')}</span>
						</label>
						{#if !speechEditor && !ensureSession}
							<div class="alert alert-warning text-sm">
								<span>{$_('fileTranscribe.noActiveEditor')}</span>
							</div>
						{/if}
						<div class="flex gap-2">
							<button class="btn btn-primary" onclick={startTranscription} disabled={!speechEditor}>
								{$_('fileTranscribe.start')}
							</button>
							<button class="btn btn-ghost" onclick={pickFile}>{$_('fileTranscribe.chooseDifferent')}</button>
						</div>
					</div>
				{/if}

				{#if phase === 'running'}
					<div class="space-y-3">
						<div>
							<div class="flex justify-between text-sm mb-1">
								<span>{$_('fileTranscribe.transcribing')}</span>
								<span>{overallProgressPct}%</span>
							</div>
							<progress class="progress progress-primary w-full" value={overallProgressPct} max="100"></progress>
						</div>
						{#if splitChannels && channelCount > 1}
							<div class="text-sm space-y-1">
								{#each Array.from({ length: channelCount }, (_, i) => i) as ch}
									{@const p = progressByChannel[ch]}
									<div class="flex justify-between">
										<span>{$_('fileTranscribe.channel')} {ch}</span>
										<span class="opacity-70">
											{#if p}{formatTime(p.processedSec)} / {formatTime(p.totalSec)}{:else}{$_('fileTranscribe.pending')}{/if}
										</span>
									</div>
								{/each}
							</div>
						{/if}
						<button class="btn btn-warning btn-sm" onclick={cancelTranscription}>{$_('fileTranscribe.cancel')}</button>
					</div>
				{/if}

				{#if phase === 'error'}
					<div class="alert alert-error">
						<span>{errorMessage || $_('fileTranscribe.unknownError')}</span>
					</div>
					<button class="btn btn-sm mt-3" onclick={resetState}>{$_('fileTranscribe.startOver')}</button>
				{/if}

				{#if phase === 'cancelled'}
					<div class="alert">
						<span>{$_('fileTranscribe.cancelled', { values: { count: segments.length } })}</span>
					</div>
				{/if}

				{#if phase === 'done'}
					<div class="alert alert-success">
						<span>{$_('fileTranscribe.done')}</span>
					</div>
				{/if}

				{#if savingState}
					<div class="text-xs opacity-70 mt-2">{$_('fileTranscribe.savingState')}</div>
				{/if}

				{#if phase === 'done' || phase === 'cancelled'}
					<div class="flex flex-wrap gap-2 mt-4">
						<button class="btn btn-primary btn-sm" disabled={segments.length === 0} onclick={() => exportAs('json')}>
							{$_('fileTranscribe.saveJson')}
						</button>
						<button class="btn btn-primary btn-sm" disabled={segments.length === 0} onclick={() => exportAs('txt')}>
							{$_('fileTranscribe.saveTxt')}
						</button>
						<button class="btn btn-ghost btn-sm" onclick={resetState}>{$_('fileTranscribe.transcribeAnother')}</button>
						<button class="btn btn-ghost btn-sm ml-auto" onclick={handleClose}>{$_('common.close')}</button>
					</div>
				{/if}
			</div>
		</div>
		<div
			class="modal-backdrop"
			role="button"
			tabindex="-1"
			aria-label={$_('common.close')}
			onclick={handleClose}
			onkeydown={(e) => { if (e.key === 'Escape') handleClose(); }}
		></div>
	</div>
{/if}
