import FMODModule, { FMOD as FMOD_ } from './fmod/fmodstudio';
import {
	STUDIO_INITFLAGS,
	INITFLAGS,
	STUDIO_LOAD_BANK_FLAGS,
} from './fmod/fmod_const';

const fmod: FMOD_ = {
	TOTAL_MEMORY: 128 * 1024 * 1024,
	preRun: preRun,
	onRuntimeInitialized: main,
};

export function initializeAudio() {
	console.log('Initializing audio');
	FMODModule(fmod);
}

// === Callbacks ===
function preRun() {
	console.log('FMOD preRun. Mounting files...');
}

function main() {
	console.log('Audio runtime Initialized!');
}
