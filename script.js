const form = document.getElementById("generator-form");
const statusText = document.getElementById("statusText");
const summaryText = document.getElementById("summaryText");
const generateBtn = document.getElementById("generateBtn");
const chooseFolderBtn = document.getElementById("chooseFolderBtn");
const clearCacheBtn = document.getElementById("clearCacheBtn");
const folderLabel = document.getElementById("folderLabel");
const installPwaBtn = document.getElementById("installPwaBtn");
const extensionsList = document.getElementById("extensionsList");
const newExtensionInput = document.getElementById("newExtensionInput");
const addExtensionBtn = document.getElementById("addExtensionBtn");
const directOnlyModeInput = document.getElementById("directOnlyMode");
const clearDestinationBeforeGenerateInput = document.getElementById("clearDestinationBeforeGenerate");
const openFolderAfterGenerateInput = document.getElementById("openFolderAfterGenerate");
const formAlert = document.getElementById("formAlert");
const progressBar = document.getElementById("progressBar");
const progressLabel = document.getElementById("progressLabel");
const phaseLabel = document.getElementById("phaseLabel");
const openFolderNowBtn = document.getElementById("openFolderNowBtn");
const generatedFilesPanel = document.getElementById("generatedFilesPanel");
const generatedFilesList = document.getElementById("generatedFilesList");

const totalFilesInput = document.getElementById("totalFiles");
const prefixInput = document.getElementById("prefix");

const CACHE_KEY = "file-generator-settings-v1";
const DB_NAME = "file-generator-db";
const STORE_NAME = "handles";
const DIRECTORY_KEY = "target-directory";
const DEFAULT_TOTAL_FILES = "120";
const DEFAULT_PREFIX = "DummyFile";
const DEFAULT_EXTENSIONS = ["pdf", "png", "jpg", "bmp", "docx", "xls", "xlsb", "xlsx", "csv"];
const DEFAULT_DIRECT_ONLY_MODE = true;
const DEFAULT_CLEAR_DESTINATION = true;
const DEFAULT_OPEN_FOLDER_AFTER_GENERATE = true;

let targetDirectoryHandle = null;
let deferredInstallPrompt = null;
let extensionCatalog = DEFAULT_EXTENSIONS.map((name) => ({ name, selected: true }));
let lastOutputDirectoryHandle = null;
let lastGeneratedFileNames = [];

function showAlert(message) {
  formAlert.textContent = message;
  formAlert.hidden = false;
}

function hideAlert() {
  formAlert.hidden = true;
  formAlert.textContent = "";
}

function setProgress(value) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)));
  progressBar.style.width = `${safeValue}%`;
  progressLabel.textContent = `${safeValue}% concluído`;
}

function setPhase(phaseName) {
  phaseLabel.textContent = `Etapa: ${phaseName}`;
}

function formatDateForName(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}_${hours}-${minutes}`;
}

function formatDateForContent(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${day}${month}${year}${hours}${minutes}${seconds}`;
}

function normalizeExtension(value) {
  return value.trim().toLowerCase().replace(/^\.+/, "");
}

function isValidExtension(value) {
  return /^[a-z0-9]{1,10}$/.test(value);
}

function getSelectedExtensions() {
  return extensionCatalog.filter((item) => item.selected).map((item) => item.name);
}

function renderExtensions() {
  extensionsList.innerHTML = "";

  for (const item of extensionCatalog) {
    const wrapper = document.createElement("label");
    wrapper.className = "extension-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = item.selected;
    checkbox.dataset.ext = item.name;

    const text = document.createElement("span");
    text.textContent = item.name;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-extension-btn";
    removeBtn.dataset.removeExt = item.name;
    removeBtn.textContent = "×";
    removeBtn.title = `Remover extensão ${item.name}`;

    wrapper.appendChild(checkbox);
    wrapper.appendChild(text);
    wrapper.appendChild(removeBtn);
    extensionsList.appendChild(wrapper);
  }
}

function loadCachedSettings() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) {
      renderExtensions();
      return;
    }

    const cache = JSON.parse(raw);
    if (cache.totalFiles) totalFilesInput.value = cache.totalFiles;
    if (cache.prefix) prefixInput.value = cache.prefix;
    if (typeof cache.directOnlyMode === "boolean") {
      directOnlyModeInput.checked = cache.directOnlyMode;
    }
    if (typeof cache.clearDestinationBeforeGenerate === "boolean") {
      clearDestinationBeforeGenerateInput.checked = cache.clearDestinationBeforeGenerate;
    }
    if (typeof cache.openFolderAfterGenerate === "boolean") {
      openFolderAfterGenerateInput.checked = cache.openFolderAfterGenerate;
    }

    if (Array.isArray(cache.extensionCatalog)) {
      const cleaned = cache.extensionCatalog
        .map((item) => ({
          name: normalizeExtension(String(item?.name ?? "")),
          selected: Boolean(item?.selected),
        }))
        .filter((item) => isValidExtension(item.name));

      if (cleaned.length > 0) {
        const dedupMap = new Map();
        for (const item of cleaned) {
          dedupMap.set(item.name, item.selected);
        }
        extensionCatalog = Array.from(dedupMap, ([name, selected]) => ({ name, selected }));
      }
    }

    if (cache.folderName) {
      folderLabel.textContent = `Pasta em cache: ${cache.folderName}`;
    }
  } catch {
    localStorage.removeItem(CACHE_KEY);
  }

  renderExtensions();
}

function persistSettings(folderName = "") {
  const cache = {
    totalFiles: totalFilesInput.value,
    prefix: prefixInput.value,
    extensionCatalog,
    directOnlyMode: directOnlyModeInput.checked,
    clearDestinationBeforeGenerate: clearDestinationBeforeGenerateInput.checked,
    openFolderAfterGenerate: openFolderAfterGenerateInput.checked,
    folderName,
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

function resetToDefaults() {
  totalFilesInput.value = DEFAULT_TOTAL_FILES;
  prefixInput.value = DEFAULT_PREFIX;
  directOnlyModeInput.checked = DEFAULT_DIRECT_ONLY_MODE;
  clearDestinationBeforeGenerateInput.checked = DEFAULT_CLEAR_DESTINATION;
  openFolderAfterGenerateInput.checked = DEFAULT_OPEN_FOLDER_AFTER_GENERATE;
  extensionCatalog = DEFAULT_EXTENSIONS.map((name) => ({ name, selected: true }));
  renderExtensions();
}

function showOpenFolderButton() {
  openFolderNowBtn.hidden = false;
}

function hideOpenFolderButton() {
  openFolderNowBtn.hidden = true;
}

function getFileExtension(fileName) {
  const parts = fileName.split(".");
  if (parts.length < 2) return "";
  return parts[parts.length - 1].toLowerCase();
}

function isImageExtension(ext) {
  return ["jpg", "jpeg", "png", "bmp", "gif", "webp"].includes(ext);
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

function createGifPlaceholderBlob() {
  const base64Gif = "R0lGODlhAQABAIAAAH2QxP///yH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==";
  const binary = atob(base64Gif);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: "image/gif" });
}

function createBmpBlob(width, height, red, green, blue) {
  const bytesPerPixel = 3;
  const rowSize = Math.floor((bytesPerPixel * width + 3) / 4) * 4;
  const pixelDataSize = rowSize * height;
  const headerSize = 54;
  const fileSize = headerSize + pixelDataSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  view.setUint8(0, 0x42);
  view.setUint8(1, 0x4d);
  view.setUint32(2, fileSize, true);
  view.setUint32(10, headerSize, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(34, pixelDataSize, true);

  let offset = headerSize;
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      view.setUint8(offset, blue);
      view.setUint8(offset + 1, green);
      view.setUint8(offset + 2, red);
      offset += 3;
    }

    while ((offset - headerSize) % rowSize !== 0) {
      view.setUint8(offset, 0);
      offset += 1;
    }
  }

  return new Blob([buffer], { type: "image/bmp" });
}

async function createDummyImageContent(extension, fileName) {
  if (extension === "gif") {
    return createGifPlaceholderBlob();
  }

  if (extension === "bmp") {
    return createBmpBlob(160, 100, 69, 125, 255);
  }

  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 100;
  const context = canvas.getContext("2d");

  if (!context) {
    return new Blob([`Imagem fictícia ${fileName}`], { type: "text/plain" });
  }

  context.fillStyle = "#E8F0FF";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#4F7DFF";
  context.fillRect(10, 10, 140, 80);
  context.fillStyle = "#FFFFFF";
  context.font = "bold 14px Segoe UI";
  context.fillText(extension.toUpperCase(), 18, 34);
  context.font = "10px Segoe UI";
  context.fillText(fileName.slice(0, 22), 18, 54);

  const mimeByExtension = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
  };

  const mimeType = mimeByExtension[extension] ?? "image/png";
  const blob = await canvasToBlob(canvas, mimeType, 0.92);
  if (blob) {
    return blob;
  }

  return new Blob([`Imagem fictícia ${fileName}`], { type: "text/plain" });
}

function getBadgeType(ext) {
  if (isImageExtension(ext)) return "image";
  if (["doc", "docx", "pdf"].includes(ext)) return "doc";
  if (["xls", "xlsx", "xlsb", "csv"].includes(ext)) return "sheet";
  return "data";
}

function renderGeneratedFiles(fileNames) {
  generatedFilesList.innerHTML = "";
  lastGeneratedFileNames = [...fileNames];

  for (const fileName of fileNames) {
    const item = document.createElement("li");
    item.className = "generated-file-item";

    const ext = getFileExtension(fileName);
    const extLabel = (ext || "ARQ").slice(0, 4).toUpperCase();
    const badge = document.createElement("span");
    badge.className = `generated-file-badge ${getBadgeType(ext)}`;

    const sheet = document.createElement("span");
    sheet.className = "generated-file-sheet";

    const tag = document.createElement("span");
    tag.className = "generated-file-ext-tag";
    tag.textContent = extLabel;

    badge.appendChild(sheet);
    badge.appendChild(tag);
    item.appendChild(badge);

    const name = document.createElement("span");
    name.className = "generated-file-name";
    name.textContent = fileName;
    item.appendChild(name);

    generatedFilesList.appendChild(item);
  }

  generatedFilesPanel.hidden = fileNames.length === 0;
}

function openGeneratedFilesPanel() {
  if (lastGeneratedFileNames.length === 0) return;
  generatedFilesPanel.hidden = false;
  generatedFilesPanel.open = true;
}

function openHandleDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveDirectoryHandle(handle) {
  const db = await openHandleDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).put(handle, DIRECTORY_KEY);

  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });

  db.close();
}

async function getSavedDirectoryHandle() {
  const db = await openHandleDb();
  const tx = db.transaction(STORE_NAME, "readonly");
  const request = tx.objectStore(STORE_NAME).get(DIRECTORY_KEY);

  const handle = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });

  db.close();
  return handle;
}

async function deleteSavedDirectoryHandle() {
  const db = await openHandleDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).delete(DIRECTORY_KEY);

  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });

  db.close();
}

async function verifyDirectoryPermission(handle) {
  if (!handle) return false;
  if (typeof handle.queryPermission !== "function") return false;

  const query = await handle.queryPermission({ mode: "readwrite" });
  if (query === "granted") return true;

  const request = await handle.requestPermission({ mode: "readwrite" });
  return request === "granted";
}

async function pickDirectory() {
  if (typeof window.showDirectoryPicker !== "function") {
    throw new Error("Seu navegador não suporta seleção de pasta.");
  }

  const handle = await window.showDirectoryPicker({ mode: "readwrite" });
  await saveDirectoryHandle(handle);

  targetDirectoryHandle = handle;
  folderLabel.textContent = `Pasta selecionada: ${handle.name}`;
  persistSettings(handle.name);
}

async function restoreCachedDirectory() {
  try {
    const handle = await getSavedDirectoryHandle();
    if (!handle) return;

    const allowed = await verifyDirectoryPermission(handle);
    if (!allowed) return;

    targetDirectoryHandle = handle;
    folderLabel.textContent = `Pasta em cache: ${handle.name}`;
    persistSettings(handle.name);
  } catch {
    targetDirectoryHandle = null;
  }
}

function getDistribution(total, extensions) {
  const extCount = extensions.length;
  const perExt = Math.floor(total / extCount);
  let remainder = total % extCount;

  return extensions.map((ext) => {
    const amount = perExt + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    return { ext, amount };
  });
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function clearDirectoryEntries(directoryHandle) {
  const names = [];

  for await (const [name] of directoryHandle.entries()) {
    names.push(name);
  }

  for (const name of names) {
    await directoryHandle.removeEntry(name, { recursive: true });
  }
}

async function writeFilesToDirectory(baseDirectoryHandle, files, onProgress = () => {}, clearDestination = false) {
  const outputDirectory = await baseDirectoryHandle.getDirectoryHandle("ArquivosDiarios", {
    create: true,
  });

  lastOutputDirectoryHandle = outputDirectory;

  if (clearDestination) {
    await clearDirectoryEntries(outputDirectory);
  }

  let saved = 0;
  for (const file of files) {
    const fileHandle = await outputDirectory.getFileHandle(file.fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(file.content);
    await writable.close();
    saved += 1;
    onProgress(saved, files.length);

    if (saved % 10 === 0 || saved === files.length) {
      statusText.textContent = `Salvando em pasta... ${saved}/${files.length}`;
    }
  }
}

async function buildFiles(totalFiles, prefix, extensions, onProgress = () => {}) {
  const now = new Date();
  const today = formatDateForName(now);
  const dataHora = formatDateForContent(now);
  const distribution = getDistribution(totalFiles, extensions);

  let count = 0;
  const files = [];

  for (const item of distribution) {
    for (let i = 1; i <= item.amount; i += 1) {
      count += 1;
      const guid = crypto.randomUUID();
      const fileName = `${prefix}_${count}_${today}.${item.ext}`;
      let content = `Teste arquivo fictício ${guid} - ${dataHora}`;

      if (isImageExtension(item.ext)) {
        content = await createDummyImageContent(item.ext, fileName);
      }

      files.push({ fileName, content });
      onProgress(count, totalFiles);
    }
  }

  return {
    files,
    count,
    today,
  };
}

function canUsePwaFeatures() {
  return window.isSecureContext && "serviceWorker" in navigator;
}

async function registerServiceWorker() {
  if (!canUsePwaFeatures()) {
    return;
  }

  try {
    await navigator.serviceWorker.register("./sw.js");
  } catch {
    statusText.textContent = "PWA indisponível neste contexto. O app continua funcional no modo web.";
  }
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installPwaBtn.hidden = false;
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  installPwaBtn.hidden = true;
  statusText.textContent = "Aplicativo instalado com sucesso.";
});

installPwaBtn.addEventListener("click", async () => {
  if (!deferredInstallPrompt) {
    statusText.textContent = "Instalação PWA não disponível neste navegador/contexto.";
    return;
  }

  deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice;

  if (choice.outcome === "accepted") {
    statusText.textContent = "Instalação iniciada.";
  } else {
    statusText.textContent = "Instalação cancelada pelo usuário.";
  }

  deferredInstallPrompt = null;
  installPwaBtn.hidden = true;
});

addExtensionBtn.addEventListener("click", () => {
  const normalized = normalizeExtension(newExtensionInput.value);

  if (!isValidExtension(normalized)) {
    statusText.textContent = "Extensão inválida. Use apenas letras/números (1 a 10 caracteres).";
    return;
  }

  const exists = extensionCatalog.some((item) => item.name === normalized);
  if (exists) {
    statusText.textContent = `A extensão ${normalized} já existe.`;
    return;
  }

  extensionCatalog.push({ name: normalized, selected: true });
  extensionCatalog.sort((a, b) => a.name.localeCompare(b.name));
  renderExtensions();
  persistSettings(targetDirectoryHandle?.name ?? "");
  statusText.textContent = `Extensão ${normalized} adicionada.`;
  newExtensionInput.value = "";
  newExtensionInput.focus();
});

newExtensionInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addExtensionBtn.click();
  }
});

extensionsList.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") {
    return;
  }

  const extName = target.dataset.ext;
  if (!extName) return;

  extensionCatalog = extensionCatalog.map((item) =>
    item.name === extName ? { ...item, selected: target.checked } : item
  );

  persistSettings(targetDirectoryHandle?.name ?? "");
});

extensionsList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const extName = target.dataset.removeExt;
  if (!extName) return;

  extensionCatalog = extensionCatalog.filter((item) => item.name !== extName);
  renderExtensions();
  persistSettings(targetDirectoryHandle?.name ?? "");
  statusText.textContent = `Extensão ${extName} removida.`;
});

chooseFolderBtn.addEventListener("click", async () => {
  try {
    await pickDirectory();
    lastOutputDirectoryHandle = null;
    statusText.textContent = "Pasta selecionada com sucesso.";
  } catch (error) {
    statusText.textContent = `Seleção de pasta cancelada/indisponível: ${error.message}`;
  }
});

directOnlyModeInput.addEventListener("change", () => {
  persistSettings(targetDirectoryHandle?.name ?? "");
});

clearDestinationBeforeGenerateInput.addEventListener("change", () => {
  persistSettings(targetDirectoryHandle?.name ?? "");
});

openFolderAfterGenerateInput.addEventListener("change", () => {
  persistSettings(targetDirectoryHandle?.name ?? "");
});

clearCacheBtn.addEventListener("click", async () => {
  clearCacheBtn.disabled = true;
  chooseFolderBtn.disabled = true;
  generateBtn.disabled = true;
  addExtensionBtn.disabled = true;

  try {
    localStorage.removeItem(CACHE_KEY);
    await deleteSavedDirectoryHandle();
    targetDirectoryHandle = null;
    lastOutputDirectoryHandle = null;
    lastGeneratedFileNames = [];
    resetToDefaults();

    folderLabel.textContent = "Nenhuma pasta selecionada. O sistema usará ZIP.";
    statusText.textContent = "Cache limpo com sucesso.";
    summaryText.textContent = "";
    hideOpenFolderButton();
    generatedFilesPanel.hidden = true;
    generatedFilesPanel.open = false;
    generatedFilesList.innerHTML = "";
  } catch (error) {
    statusText.textContent = `Falha ao limpar cache: ${error.message}`;
  } finally {
    clearCacheBtn.disabled = false;
    chooseFolderBtn.disabled = false;
    generateBtn.disabled = false;
    addExtensionBtn.disabled = false;
  }
});

openFolderNowBtn.addEventListener("click", async () => {
  if (lastGeneratedFileNames.length === 0) {
    statusText.textContent = "Nenhum arquivo gerado para exibir.";
    return;
  }

  openGeneratedFilesPanel();
  statusText.textContent = "Lista de arquivos gerados exibida.";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideAlert();
  setProgress(0);
  setPhase("Preparando");

  if (typeof JSZip === "undefined") {
    statusText.textContent = "Erro: biblioteca JSZip não carregada.";
    showAlert("Não foi possível iniciar: biblioteca JSZip não carregada.");
    setPhase("Falha");
    return;
  }

  const totalFiles = Number(totalFilesInput.value);
  const prefix = prefixInput.value.trim() || DEFAULT_PREFIX;
  const extensions = getSelectedExtensions();
  const directOnlyMode = directOnlyModeInput.checked;
  const clearDestinationBeforeGenerate = clearDestinationBeforeGenerateInput.checked;
  const openFolderAfterGenerate = openFolderAfterGenerateInput.checked;

  if (!Number.isInteger(totalFiles) || totalFiles <= 0) {
    statusText.textContent = "Informe um total de arquivos válido (inteiro > 0).";
    showAlert("Informe um total de arquivos válido (inteiro maior que zero).");
    setPhase("Falha");
    return;
  }

  if (extensions.length === 0) {
    statusText.textContent = "Selecione ao menos uma extensão.";
    showAlert("Selecione ao menos uma extensão para iniciar a geração.");
    setPhase("Falha");
    return;
  }

  if (directOnlyMode && !targetDirectoryHandle) {
    statusText.textContent = "Selecione uma pasta antes de gerar os arquivos.";
    showAlert("Pasta de destino obrigatória: selecione uma pasta para continuar a geração sem compactação.");
    setPhase("Falha");
    return;
  }

  generateBtn.disabled = true;
  chooseFolderBtn.disabled = true;
  clearCacheBtn.disabled = true;
  addExtensionBtn.disabled = true;
  summaryText.textContent = "";
  hideOpenFolderButton();
  generatedFilesPanel.hidden = true;
  generatedFilesPanel.open = false;
  generatedFilesList.innerHTML = "";
  lastGeneratedFileNames = [];

  try {
    statusText.textContent = "Gerando arquivos em memória...";
    setPhase("Gerando");
    lastOutputDirectoryHandle = null;

    const { files, count, today } = await buildFiles(totalFiles, prefix, extensions, (current, total) => {
      setProgress((current / total) * 40);
    });
    const generatedNames = files.map((file) => file.fileName);
    let usedDirectSave = false;
    let canWriteDirect = false;

    if (targetDirectoryHandle) {
      const allowed = await verifyDirectoryPermission(targetDirectoryHandle);
      if (allowed) {
        canWriteDirect = true;
        setPhase("Salvando");
        if (clearDestinationBeforeGenerate) {
          statusText.textContent = "Limpando pasta de destino...";
          setProgress(42);
        }
        await writeFilesToDirectory(targetDirectoryHandle, files, (saved, total) => {
          setProgress(40 + (saved / total) * 60);
        }, clearDestinationBeforeGenerate);
        statusText.textContent = "Concluído com gravação direta em pasta.";
        summaryText.textContent = `${count} arquivos gerados em ArquivosDiarios dentro da pasta selecionada.`;
        usedDirectSave = true;
        renderGeneratedFiles(generatedNames);

        if (openFolderAfterGenerate) {
          openGeneratedFilesPanel();
          statusText.textContent = "Concluído com gravação direta em pasta. Lista de arquivos exibida.";
        } else {
          showOpenFolderButton();
        }
      }
    }

    if (directOnlyMode && !usedDirectSave) {
      if (!targetDirectoryHandle) {
        throw new Error("Modo sem ZIP ativo. Selecione uma pasta de destino para gerar os arquivos.");
      }
      if (!canWriteDirect) {
        throw new Error("Modo sem ZIP ativo. Permissão de escrita na pasta não concedida.");
      }
    }

    if (!usedDirectSave) {
      statusText.textContent = "Compactando ZIP...";
      setProgress(45);
      setPhase("Compactando");

      const zip = new JSZip();
      const rootFolder = zip.folder("ArquivosDiarios");

      for (const file of files) {
        rootFolder.file(file.fileName, file.content);
      }

      const zipBlob = await zip.generateAsync(
        { type: "blob" },
        (metadata) => {
          statusText.textContent = `Compactando ZIP... ${Math.round(metadata.percent)}%`;
          setProgress(45 + metadata.percent * 0.55);
        }
      );

      const zipName = `ArquivosDiarios_${today}.zip`;
      downloadBlob(zipBlob, zipName);

      statusText.textContent = "Concluído com download ZIP.";
      summaryText.textContent = `${count} arquivos gerados e baixados em ${zipName}.`;
      renderGeneratedFiles(generatedNames);

      if (openFolderAfterGenerate) {
        openGeneratedFilesPanel();
        statusText.textContent = "Concluído com download ZIP. Lista de arquivos exibida.";
      } else {
        showOpenFolderButton();
      }
    }

    setProgress(100);
    setPhase("Finalizado");
    persistSettings(targetDirectoryHandle?.name ?? "");
  } catch (error) {
    statusText.textContent = `Erro: ${error.message}`;
    showAlert(error.message);
    setPhase("Falha");
  } finally {
    generateBtn.disabled = false;
    chooseFolderBtn.disabled = false;
    clearCacheBtn.disabled = false;
    addExtensionBtn.disabled = false;
  }
});

loadCachedSettings();
restoreCachedDirectory();
registerServiceWorker();
