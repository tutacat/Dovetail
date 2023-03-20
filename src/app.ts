import "./compression-polyfill.js";
import { read, write, parse, stringify, Name, Endian, Compression, BedrockLevel, Int, NBTData, NBTDataOptions } from "nbtify";

if (window.isSecureContext){
  await navigator.serviceWorker.register("./service-worker.js");
}

const saver = document.querySelector<HTMLButtonElement>("#saver")!;
const fileOpener = document.querySelector<HTMLInputElement>("#fileOpener")!;
const formatOpener = document.querySelector<HTMLButtonElement>("#formatOpener")!;
const editor = document.querySelector<HTMLTextAreaElement>("#editor")!;
const formatDialog = document.querySelector<HTMLDialogElement>("#formatDialog")!;
const formatForm = document.querySelector<HTMLFormElement>("#formatForm")!;

/**
 * The name of the currently opened file.
*/
let name: string;

document.addEventListener("dragover",event => {
  event.preventDefault();
  if (event.dataTransfer === null) return;

  event.dataTransfer.dropEffect = "copy";
});

document.addEventListener("drop",async event => {
  event.preventDefault();
  if (event.dataTransfer === null) return;

  const items = [...event.dataTransfer.items].filter(item => item.kind === "file");
  if (items.length === 0) return;

  const [item] = items;
  const file = item.getAsFile()!;
  await openFile(file);
});

saver.addEventListener("click",async () => {
  const snbt = editor.value;
  const nbt = parse(snbt);
  const options = saveOptions();
  const nbtData = new NBTData(nbt,options);
  const file = await writeFile(nbtData);

  const isiOSDevice = (
    /^(Mac|iPhone|iPad|iPod)/i.test(navigator.userAgentData?.platform ?? navigator.platform) &&
    typeof navigator.standalone === "boolean"
  );

  if (isiOSDevice && window.isSecureContext){
    await shareFile(file);
  } else {
    saveFile(file);
  }
});

fileOpener.addEventListener("change",async () => {
  if (fileOpener.files === null) return;
  if (fileOpener.files.length === 0) return;

  const [file] = fileOpener.files;
  await openFile(file);
});

formatOpener.addEventListener("click",() => {
  formatDialog.showModal();
});

// const demo = await fetch("../NBTify/test/nbt/ridiculous.nbt")
//   .then(response => response.blob())
//   .then(blob => new File([blob],"ridiculous.nbt"));

// await openFile(demo);

// formatOpener.click();

/**
 * Shows the open file picker to the user.
*/
export async function openFile(file: File){
  saver.disabled = true;
  formatOpener.disabled = true;
  editor.disabled = true;

  const nbt = await readFile(file);
  if (nbt === null) return;

  const snbt = stringify(nbt,{ space: 2 });
  openOptions(nbt);
  name = file.name;

  document.title = `Dovetail - ${name}`;

  saver.disabled = false;
  formatOpener.disabled = false;
  editor.value = snbt;
  editor.disabled = false;
}

export interface FormatOptionsCollection extends HTMLFormControlsCollection {
  name: HTMLInputElement;
  disableName: HTMLInputElement;
  endian: RadioNodeList;
  compression: RadioNodeList;
  bedrockLevel: HTMLInputElement;
}

/**
 * Updates the Format Options dialog to match the NBT file's metadata.
*/
export function openOptions({ name, endian, compression, bedrockLevel }: NBTData){
  const elements = formatForm.elements as FormatOptionsCollection;

  if (name !== null){
    elements.name.value = name;
    elements.name.disabled = false;
    elements.disableName.checked = false;
  } else {
    elements.name.value = "";
    elements.name.disabled = true;
    elements.disableName.checked = true;
  }
  elements.endian.value = endian;
  elements.compression.value = compression ?? "none";
  elements.bedrockLevel.value = (bedrockLevel === undefined) ? "" : `${bedrockLevel}`;

  const options: NBTDataOptions = { name, endian, compression, bedrockLevel };
  return options;
}

/**
 * Attempts to create an NBTData object from a File object.
*/
export async function readFile(file: File){
  try {
    const buffer = await file.arrayBuffer();
    const nbt = await read(buffer);
    return nbt;
  } catch (error){
    alert(error);
    return null;
  }
}

/**
 * Turns the values from the Format Options dialog into the NBT file's metadata.
*/
export function saveOptions(){
  const elements = formatForm.elements as FormatOptionsCollection;

  const name: Name = (elements.disableName.checked) ? null : elements.name.value;
  const endian: Endian = elements.endian.value as Endian;
  const compression: Compression | null = (elements.compression.value === "none") ? null : elements.compression.value as Compression;
  const bedrockLevel: BedrockLevel | null = (elements.bedrockLevel.value === "") ? null : new Int(parseInt(elements.bedrockLevel.value));

  const options: NBTDataOptions = { name, endian, compression, bedrockLevel };
  return options;
}

/**
 * Shows the save file picker to the user.
*/
export function saveFile(file: File){
  const anchor = document.createElement("a");
  const blob = URL.createObjectURL(file);

  anchor.href = blob;
  anchor.download = file.name;
  anchor.click();

  URL.revokeObjectURL(blob);
}

/**
 * Shows the file share menu to the user.
*/
export async function shareFile(file: File){
  try {
    await navigator.share({ files: [file] });
  } catch (error){
    console.warn(error);
  }
}

/**
 * Creates a File object from an NBTData object.
*/
export async function writeFile(nbt: NBTData){
  const data = await write(nbt);
  const file = new File([data],name);
  return file;
}