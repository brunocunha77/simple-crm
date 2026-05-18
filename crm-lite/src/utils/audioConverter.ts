import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
	if (ffmpeg && ffmpeg.loaded) return ffmpeg;
	
	ffmpeg = new FFmpeg();
	
	const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
	
	await ffmpeg.load({
		coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
		wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
	});
	
	return ffmpeg;
}

export async function convertToOgg(inputBlob: Blob, inputFormat: string = 'mp4'): Promise<Blob> {
	void 0;
	void 0;
	
	const ff = await getFFmpeg();
	
	const inputFileName = `input.${inputFormat}`;
	const outputFileName = 'output.ogg';
	
	await ff.writeFile(inputFileName, await fetchFile(inputBlob));
	
	await ff.exec([
		'-i', inputFileName,
		'-c:a', 'libopus',
		'-b:a', '64k',
		'-ac', '1',
		'-ar', '48000',
		'-application', 'voip',
		outputFileName
	]);
	
	const data = await ff.readFile(outputFileName);
	const oggBlob = new Blob([data], { type: 'audio/ogg; codecs=opus' });
	
	void 0;
	
	await ff.deleteFile(inputFileName);
	await ff.deleteFile(outputFileName);
	
	return oggBlob;
}
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
	if (ffmpeg && ffmpeg.loaded) return ffmpeg;
	
	ffmpeg = new FFmpeg();
	
	const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
	
	await ffmpeg.load({
		coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
		wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
	});
	
	return ffmpeg;
}

export async function convertToOgg(inputBlob: Blob, inputFormat: string = 'mp4'): Promise<Blob> {
	void 0;
	void 0;
	
	const ff = await getFFmpeg();
	
	const inputFileName = `input.${inputFormat}`;
	const outputFileName = 'output.ogg';
	
	await ff.writeFile(inputFileName, await fetchFile(inputBlob));
	
	await ff.exec([
		'-i', inputFileName,
		'-c:a', 'libopus',
		'-b:a', '64k',
		'-ac', '1',
		'-ar', '48000',
		'-application', 'voip',
		outputFileName
	]);
	
	const data = await ff.readFile(outputFileName);
	const oggBlob = new Blob([data], { type: 'audio/ogg; codecs=opus' });
	
	void 0;
	
	await ff.deleteFile(inputFileName);
	await ff.deleteFile(outputFileName);
	
	return oggBlob;
}
