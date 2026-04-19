/**
 * Store for managing modal visibility state across components.
 * This allows the navbar in +layout.svelte to control modals
 * that are rendered in +page.svelte.
 */

// Modal visibility state using Svelte 5 runes
let _showSessionsModal = $state(false);
let _showDictionariesModal = $state(false);
let _showHelpModal = $state(false);
let _showFileTranscribeModal = $state(false);

export const modalStore = {
	get showSessionsModal() {
		return _showSessionsModal;
	},
	set showSessionsModal(value: boolean) {
		_showSessionsModal = value;
	},
	get showDictionariesModal() {
		return _showDictionariesModal;
	},
	set showDictionariesModal(value: boolean) {
		_showDictionariesModal = value;
	},
	get showHelpModal() {
		return _showHelpModal;
	},
	set showHelpModal(value: boolean) {
		_showHelpModal = value;
	},
	openSessions() {
		_showSessionsModal = true;
	},
	closeSessions() {
		_showSessionsModal = false;
	},
	openDictionaries() {
		_showDictionariesModal = true;
	},
	closeDictionaries() {
		_showDictionariesModal = false;
	},
	openHelp() {
		_showHelpModal = true;
	},
	closeHelp() {
		_showHelpModal = false;
	},
	get showFileTranscribeModal() {
		return _showFileTranscribeModal;
	},
	set showFileTranscribeModal(value: boolean) {
		_showFileTranscribeModal = value;
	},
	openFileTranscribe() {
		_showFileTranscribeModal = true;
	},
	closeFileTranscribe() {
		_showFileTranscribeModal = false;
	}
};
