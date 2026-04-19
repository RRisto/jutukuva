export interface TranscriptSegment {
	text: string;
	start: number;
	end: number;
	channel: number;
}

export interface TranscriptResult {
	source: string;
	durationSec: number;
	channelCount: number;
	segments: TranscriptSegment[];
}

function formatTime(seconds: number): string {
	const s = Math.max(0, Math.floor(seconds));
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function mergedText(segments: TranscriptSegment[]): string {
	return [...segments]
		.sort((a, b) => a.start - b.start)
		.map((s) => s.text)
		.join(' ');
}

export function toJson(result: TranscriptResult): string {
	const byChannel: Record<string, TranscriptSegment[]> = {};
	for (const seg of result.segments) {
		const key = String(seg.channel);
		if (!byChannel[key]) byChannel[key] = [];
		byChannel[key].push(seg);
	}
	const payload = {
		source: result.source,
		durationSec: result.durationSec,
		channelCount: result.channelCount,
		segments: [...result.segments].sort((a, b) => a.start - b.start),
		channels: byChannel,
		mergedText: mergedText(result.segments)
	};
	return JSON.stringify(payload, null, 2);
}

export function toTxt(result: TranscriptResult, options: { timestamps?: boolean } = {}): string {
	const showTs = options.timestamps !== false;
	const lines: string[] = [
		'='.repeat(60),
		'TRANSCRIPTION RESULTS',
		`Source: ${result.source}`,
		`Duration: ${formatTime(result.durationSec)}`,
		`Channels: ${result.channelCount}`,
		'='.repeat(60),
		''
	];

	const channels = new Map<number, TranscriptSegment[]>();
	for (const seg of result.segments) {
		if (!channels.has(seg.channel)) channels.set(seg.channel, []);
		channels.get(seg.channel)!.push(seg);
	}

	const sortedChannelKeys = [...channels.keys()].sort((a, b) => a - b);
	for (const ch of sortedChannelKeys) {
		lines.push(`--- Channel ${ch} ---`);
		for (const seg of channels.get(ch)!) {
			if (showTs) {
				lines.push(`[${formatTime(seg.start)} -> ${formatTime(seg.end)}] ${seg.text}`);
			} else {
				lines.push(seg.text);
			}
		}
		lines.push('');
	}

	if (channels.size > 1) {
		lines.push('--- Merged (by timestamp) ---');
		const sorted = [...result.segments].sort((a, b) => a.start - b.start);
		for (const seg of sorted) {
			const chMarker = `[Ch${seg.channel}]`;
			if (showTs) {
				lines.push(`[${formatTime(seg.start)} -> ${formatTime(seg.end)}] ${chMarker} ${seg.text}`);
			} else {
				lines.push(`${chMarker} ${seg.text}`);
			}
		}
	}

	return lines.join('\n');
}

export function defaultExportName(source: string, ext: 'json' | 'txt'): string {
	const base = source.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '');
	return `${base || 'transcript'}.${ext}`;
}
