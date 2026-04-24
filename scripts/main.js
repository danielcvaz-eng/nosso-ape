import produtos from "../data/produtos.js";
import { APP_CONFIG, LABELS, MODAL_STEPS } from "./config.js";
import { clearPersistedState, loadPersistedState, savePersistedState } from "./storage.js";
import { buildWhatsAppUrl, clamp, createSlug, escapeHtml, formatCurrency, normalizeText, safeExternalUrl, safeNumber } from "./utils.js";

const elements = {
  productsList: document.getElementById("products-list"),
  productsCounter: document.getElementById("products-counter"),
  totalProducts: document.getElementById("total-products"),
  catalogControls: document.getElementById("catalog-controls"),
  searchInput: document.getElementById("search-input"),
  categoryFilter: document.getElementById("category-filter"),
  priorityFilter: document.getElementById("priority-filter"),
  statusFilter: document.getElementById("status-filter"),
  clearFiltersButton: document.getElementById("clear-filters"),
  emptyState: document.getElementById("empty-state"),
  residentToggle: document.getElementById("resident-toggle"),
  localStateNote: document.getElementById("local-state-note"),
  resetDataButton: document.getElementById("reset-local-data"),
  giftModal: document.getElementById("gift-modal"),
  closeModalButton: document.getElementById("close-modal"),
  giftForm: document.getElementById("gift-form"),
  modalTitle: document.getElementById("modal-title"),
  modalDescription: document.getElementById("modal-description"),
  modalStepLabel: document.getElementById("modal-step-label"),
  selectedProduct: document.getElementById("selected-product"),
  contributionField: document.getElementById("contribution-field"),
  contributionValue: document.getElementById("contribution-value"),
  personName: document.getElementById("person-name"),
  optionalMessage: document.getElementById("optional-message"),
  pixKey: document.getElementById("pix-key"),
  pixType: document.getElementById("pix-type"),
  pixReceiver: document.getElementById("pix-receiver"),
  pixValue: document.getElementById("pix-value"),
  copyPixButton: document.getElementById("copy-pix-button"),
  copyFeedback: document.getElementById("copy-feedback"),
  paymentConfirmation: document.getElementById("payment-confirmation"),
  successMessage: document.getElementById("success-message"),
  formError: document.getElementById("form-error"),
  backButton: document.getElementById("back-button"),
  primaryFlowButton: document.getElementById("primary-flow-button"),
  modalSteps: document.querySelectorAll(".modal-step"),
  whatsappSupportLink: document.getElementById("whatsapp-support-link"),
  publicationWhatsappLink: document.getElementById("publication-whatsapp-link")
};

const appState = {
  residentModeEnabled: false,
  currentStep: "details",
  selectedProduct: null,
  flowData: null,
  persisted: loadPersistedState(produtos)
};

function persistState() {
  savePersistedState({
    statuses: appState.persisted.statuses,
    contributions: appState.persisted.contributions
  });
}

function getContribution(product) {
  const storedValue = safeNumber(appState.persisted.contributions[product.id]);
  return clamp(storedValue, 0, product.preco);
}

function getProductStatus(product, contributionValue = getContribution(product)) {
  const manualStatus = appState.persisted.statuses[product.id] || product.status || "disponivel";

  if (product.tipo === "colaborativo" && contributionValue >= product.preco) {
    return "recebido";
  }

  return manualStatus;
}

function getProductsWithState() {
  return produtos.map((product) => {
    const collectedAmount = getContribution(product);
    const remainingAmount = Math.max(product.preco - collectedAmount, 0);
    const progressPercentage = product.preco > 0 ? Math.min((collectedAmount / product.preco) * 100, 100) : 0;

    return {
      ...product,
      statusAtual: getProductStatus(product, collectedAmount),
      valorArrecadado: collectedAmount,
      valorFaltante: remainingAmount,
      percentual: progressPercentage
    };
  });
}

function updateProductStatus(productId, nextStatus) {
  const product = produtos.find((item) => item.id === Number(productId));

  if (!product) {
    return;
  }

  appState.persisted.statuses[productId] = nextStatus;

  if (nextStatus === "recebido" && product.tipo === "colaborativo") {
    appState.persisted.contributions[productId] = product.preco;
  }

  if (nextStatus !== "recebido" && product.tipo === "colaborativo" && getContribution(product) >= product.preco) {
    delete appState.persisted.contributions[productId];
  }

  persistState();
}

function updateContribution(productId, totalValue) {
  const product = produtos.find((item) => item.id === Number(productId));

  if (!product) {
    return;
  }

  appState.persisted.contributions[productId] = clamp(totalValue, 0, product.preco);
  persistState();
}

function clearLocalData() {
  appState.persisted.statuses = {};
  appState.persisted.contributions = {};
  clearPersistedState();
  persistState();
}

function filterProducts(productsWithState) {
  const searchTerm = normalizeText(elements.searchInput.value.trim());
  const category = elements.categoryFilter.value;
  const priority = elements.priorityFilter.value;
  const status = elements.statusFilter.value;

  return productsWithState.filter((product) => {
    const searchMatches = normalizeText(product.nome).includes(searchTerm);
    const categoryMatches = category === "todos" || product.categoria === category;
    const priorityMatches = priority === "todos" || product.prioridade === priority;
    const statusMatches = status === "todos" || product.statusAtual === status;

    return searchMatches && categoryMatches && priorityMatches && statusMatches;
  });
}

function groupByCategory(productsList) {
  return productsList.reduce((groups, product) => {
    if (!groups[product.categoria]) {
      groups[product.categoria] = [];
    }

    groups[product.categoria].push(product);
    return groups;
  }, {});
}

function createEstimatedPriceBadge(product) {
  return product.precoEstimado
    ? '<span class="product-estimate">preço de referência</span>'
    : "";
}

function createStatusControl(product) {
  if (!appState.residentModeEnabled) {
    return "";
  }

  return `
    <label class="status-editor">
      Status local do item
      <select data-status-product-id="${product.id}">
        <option value="disponivel" ${product.statusAtual === "disponivel" ? "selected" : ""}>Disponível</option>
        <option value="reservado" ${product.statusAtual === "reservado" ? "selected" : ""}>Reservado</option>
        <option value="recebido" ${product.statusAtual === "recebido" ? "selected" : ""}>Recebido</option>
      </select>
    </label>
  `;
}

function createGiftButtonLabel(status) {
  if (status === "reservado") {
    return "Item reservado";
  }

  if (status === "recebido") {
    return "Item recebido";
  }

  return "Quero presentear";
}

function createContributionProgress(product) {
  if (product.tipo !== "colaborativo") {
    return "";
  }

  return `
    <div class="contribution-progress" aria-label="Progresso de contribuição">
      <div class="progress-topline">
        <span>Arrecadado: ${formatCurrency(product.valorArrecadado)}</span>
        <strong>${Math.round(product.percentual)}%</strong>
      </div>
      <div class="progress-bar">
        <span style="width: ${product.percentual}%"></span>
      </div>
      <p>Falta ${formatCurrency(product.valorFaltante)} para completar este item.</p>
    </div>
  `;
}

function createProductCard(product) {
  const priorityClass = `priority-${product.prioridade}`;
  const statusClass = `status-${product.statusAtual}`;
  const isUnavailable = product.statusAtual !== "disponivel";

  return `
    <article class="product-card ${priorityClass} ${statusClass}">
      <div class="product-card-header">
        <span class="product-category">${escapeHtml(product.categoria)}</span>
        <span class="product-status ${statusClass}">${escapeHtml(LABELS.status[product.statusAtual] || product.statusAtual)}</span>
      </div>

      <h3 class="product-name">${escapeHtml(product.nome)}</h3>

      <div class="product-price-row">
        <strong class="product-price">${formatCurrency(product.preco)}</strong>
        ${createEstimatedPriceBadge(product)}
      </div>

      <p class="product-description">${escapeHtml(product.descricao)}</p>

      <div class="product-details">
        <span>${escapeHtml(LABELS.prioridade[product.prioridade] || product.prioridade)}</span>
        <span>${escapeHtml(LABELS.tipo[product.tipo] || product.tipo)}</span>
      </div>

      ${createContributionProgress(product)}
      ${createStatusControl(product)}

      <div class="product-actions">
        <button class="gift-button" type="button" data-product-id="${product.id}" ${isUnavailable ? "disabled" : ""}>
          ${createGiftButtonLabel(product.statusAtual)}
        </button>
        <a class="product-link" href="${safeExternalUrl(product.link)}" target="_blank" rel="noopener noreferrer">
          Ver produto
        </a>
      </div>
    </article>
  `;
}

function createCategoryGroup(category, productsList) {
  const categoryId = createSlug(category);
  const cards = productsList.map(createProductCard).join("");

  return `
    <section class="category-group" aria-labelledby="categoria-${categoryId}">
      <div class="category-header">
        <h3 id="categoria-${categoryId}">${escapeHtml(category)}</h3>
        <span>${productsList.length} item(ns)</span>
      </div>
      <div class="products-grid">
        ${cards}
      </div>
    </section>
  `;
}

function updateLocalStateNote() {
  const storedStatusesCount = Object.keys(appState.persisted.statuses).length;
  const storedContributionsCount = Object.keys(appState.persisted.contributions).length;
  const totalRecords = storedStatusesCount + storedContributionsCount;

  if (!appState.persisted.storageAvailable) {
    elements.localStateNote.textContent = "Este navegador bloqueou localStorage. O catálogo funciona, mas status e progresso locais não serão salvos.";
    return;
  }

  if (totalRecords === 0) {
    elements.localStateNote.textContent = "Nenhum registro local salvo neste navegador. A confirmação oficial dos presentes continua manual pelos moradores.";
    return;
  }

  elements.localStateNote.textContent = `${totalRecords} registro(s) local(is) ativos neste navegador. Eles servem como apoio operacional e não substituem a confirmação manual dos moradores.`;
}

function renderCatalog() {
  const productsWithState = getProductsWithState();
  const filteredProducts = filterProducts(productsWithState);
  const groupedProducts = groupByCategory(filteredProducts);
  const categories = Object.keys(groupedProducts).sort();

  elements.productsCounter.textContent = `${filteredProducts.length} de ${produtos.length} itens`;
  elements.totalProducts.textContent = `${produtos.length} itens`;
  elements.emptyState.classList.toggle("hidden", filteredProducts.length > 0);
  updateLocalStateNote();

  elements.productsList.innerHTML = categories
    .map((category) => createCategoryGroup(category, groupedProducts[category]))
    .join("");
}

function populateCategoryFilter() {
  const categories = [...new Set(produtos.map((product) => product.categoria))].sort();
  const options = categories
    .map((category) => `<option value="${category}">${category}</option>`)
    .join("");

  elements.categoryFilter.insertAdjacentHTML("beforeend", options);
}

function getSelectedProduct(productId) {
  return getProductsWithState().find((product) => product.id === Number(productId)) || null;
}

function createSelectedProductSummary(product) {
  const priceText = product.precoEstimado
    ? `${formatCurrency(product.preco)} (preço de referência)`
    : formatCurrency(product.preco);
  const progressText = product.tipo === "colaborativo"
    ? `<span>Arrecadado: ${formatCurrency(product.valorArrecadado)} • Falta: ${formatCurrency(product.valorFaltante)}</span>`
    : "";

  return `
    <p>Produto escolhido</p>
    <strong>${escapeHtml(product.nome)}</strong>
    <span>${escapeHtml(product.categoria)} • ${escapeHtml(priceText)} • ${escapeHtml(LABELS.tipo[product.tipo])}</span>
    ${progressText}
  `;
}

function showFormError(message) {
  elements.formError.textContent = message;
  elements.formError.classList.remove("hidden");
}

function clearFormError() {
  elements.formError.textContent = "";
  elements.formError.classList.add("hidden");
}

function setPrimaryButtonState() {
  if (appState.currentStep !== "pix") {
    elements.primaryFlowButton.disabled = false;
    return;
  }

  elements.primaryFlowButton.disabled = !elements.paymentConfirmation.checked;
}

function updateModalStep(step) {
  appState.currentStep = step;
  const stepConfig = MODAL_STEPS[step];

  elements.modalStepLabel.textContent = stepConfig.label;
  elements.modalTitle.textContent = stepConfig.title;
  elements.modalDescription.textContent = stepConfig.description;
  elements.primaryFlowButton.textContent = stepConfig.button;
  elements.backButton.classList.toggle("hidden", step !== "pix");

  elements.modalSteps.forEach((modalStep) => {
    modalStep.classList.toggle("hidden", modalStep.dataset.step !== step);
  });

  clearFormError();
  setPrimaryButtonState();
}

function getSelectedGiftType() {
  return elements.giftForm.elements.giftType.value;
}

function getSelectedFlowValue() {
  if (!appState.selectedProduct) {
    return 0;
  }

  if (getSelectedGiftType() === "inteiro") {
    return appState.selectedProduct.tipo === "colaborativo"
      ? appState.selectedProduct.valorFaltante
      : appState.selectedProduct.preco;
  }

  return parseContributionInput(elements.contributionValue.value);
}

function parseContributionInput(value) {
  const trimmedValue = value.trim();
  const hasComma = trimmedValue.includes(",");
  const hasDot = trimmedValue.includes(".");
  const normalizedValue = hasComma && hasDot
    ? trimmedValue.replace(/\./g, "").replace(",", ".")
    : trimmedValue.replace(",", ".");

  return safeNumber(normalizedValue);
}

function updateContributionField() {
  const shouldShow = getSelectedGiftType() === "colaborativo";
  elements.contributionField.classList.toggle("hidden", !shouldShow);
  elements.contributionValue.required = shouldShow;

  if (!appState.selectedProduct) {
    return;
  }

  if (shouldShow) {
    elements.contributionValue.placeholder = `Até ${formatCurrency(appState.selectedProduct.valorFaltante)}`;
    return;
  }

  elements.contributionValue.value = "";
}

function configureGiftOptions(product) {
  const wholeGiftOption = elements.giftForm.querySelector('input[name="giftType"][value="inteiro"]');
  const collaborativeOption = elements.giftForm.querySelector('input[name="giftType"][value="colaborativo"]');

  if (product.tipo === "inteiro") {
    wholeGiftOption.checked = true;
    collaborativeOption.closest("label").classList.add("hidden");
  } else {
    collaborativeOption.checked = true;
    collaborativeOption.closest("label").classList.remove("hidden");
  }

  updateContributionField();
}

function openModal(product) {
  if (!product || product.statusAtual !== "disponivel") {
    return;
  }

  appState.selectedProduct = product;
  appState.flowData = null;

  elements.selectedProduct.innerHTML = createSelectedProductSummary(product);
  elements.giftForm.reset();
  elements.paymentConfirmation.checked = false;
  elements.copyFeedback.textContent = "";
  elements.successMessage.textContent = APP_CONFIG.finalGiftMessage;
  configureGiftOptions(product);
  updateModalStep("details");
  elements.giftModal.classList.add("is-open");
  elements.giftModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  elements.personName.focus();
}

function closeModal() {
  elements.giftModal.classList.remove("is-open");
  elements.giftModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  appState.selectedProduct = null;
  appState.flowData = null;
  updateModalStep("details");
}

function validateInitialStep() {
  const personName = elements.personName.value.trim();
  const giftType = getSelectedGiftType();
  const selectedValue = getSelectedFlowValue();

  if (!personName) {
    showFormError("Informe seu nome para continuar.");
    elements.personName.focus();
    return null;
  }

  if (!appState.selectedProduct || appState.selectedProduct.statusAtual !== "disponivel") {
    showFormError("Este item não está disponível para presente no momento.");
    return null;
  }

  if (giftType === "colaborativo") {
    if (selectedValue <= 0) {
      showFormError("Informe um valor de colaboração maior que zero.");
      elements.contributionValue.focus();
      return null;
    }

    if (selectedValue > appState.selectedProduct.valorFaltante) {
      showFormError(`O valor máximo para completar este item é ${formatCurrency(appState.selectedProduct.valorFaltante)}.`);
      elements.contributionValue.focus();
      return null;
    }
  }

  if (giftType === "inteiro" && selectedValue <= 0) {
    showFormError("Este item já parece completo ou indisponível.");
    return null;
  }

  return {
    personName,
    giftType,
    selectedValue,
    optionalMessage: elements.optionalMessage.value.trim()
  };
}

function preparePixStep() {
  const validatedData = validateInitialStep();

  if (!validatedData) {
    return;
  }

  appState.flowData = validatedData;
  elements.pixValue.textContent = formatCurrency(validatedData.selectedValue);
  elements.paymentConfirmation.checked = false;
  elements.copyFeedback.textContent = "";
  updateModalStep("pix");
}

function registerSimulatedPayment() {
  if (!elements.paymentConfirmation.checked) {
    showFormError("Marque a confirmação para registrar esta intenção local no navegador.");
    return;
  }

  if (!appState.selectedProduct || !appState.flowData) {
    showFormError("Não foi possível concluir esse fluxo. Feche o modal e tente novamente.");
    return;
  }

  if (appState.flowData.giftType === "inteiro") {
    if (appState.selectedProduct.tipo === "colaborativo") {
      updateContribution(appState.selectedProduct.id, appState.selectedProduct.preco);
    }

    updateProductStatus(appState.selectedProduct.id, "recebido");
  } else {
    const updatedTotal = appState.selectedProduct.valorArrecadado + appState.flowData.selectedValue;
    updateContribution(appState.selectedProduct.id, updatedTotal);

    if (updatedTotal >= appState.selectedProduct.preco) {
      updateProductStatus(appState.selectedProduct.id, "recebido");
    }
  }

  appState.selectedProduct = getSelectedProduct(appState.selectedProduct.id);
  renderCatalog();
  updateModalStep("success");
}

function buildWhatsAppMessage() {
  if (!appState.selectedProduct || !appState.flowData) {
    return "";
  }

  const priceText = appState.selectedProduct.precoEstimado
    ? `${formatCurrency(appState.selectedProduct.preco)} como preço de referência`
    : formatCurrency(appState.selectedProduct.preco);

  const messageParts = [
    `Oi, ${APP_CONFIG.referenceName}! Eu sou ${appState.flowData.personName}.`,
    `Vi o item "${appState.selectedProduct.nome}" no site e quero ${LABELS.tipoEscolhido[appState.flowData.giftType]}.`,
    `Categoria: ${appState.selectedProduct.categoria}.`,
    `Preço do item: ${priceText}.`,
    `Valor do Pix: ${formatCurrency(appState.flowData.selectedValue)}.`,
    `Registrei a intenção pelo site e sei que a confirmação final será manual.`
  ];

  if (appState.flowData.optionalMessage) {
    messageParts.push(`Mensagem: ${appState.flowData.optionalMessage}`);
  }

  return messageParts.join("\n");
}

function openWhatsApp(message) {
  const url = buildWhatsAppUrl(APP_CONFIG.whatsappNumber, message);
  const openedWindow = window.open(url, "_blank");

  if (!openedWindow) {
    window.location.href = url;
    return;
  }

  openedWindow.opener = null;
}

async function copyPixKey() {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(APP_CONFIG.pix.key);
    } else {
      const temporaryField = document.createElement("textarea");
      temporaryField.value = APP_CONFIG.pix.key;
      temporaryField.setAttribute("readonly", "");
      temporaryField.style.position = "absolute";
      temporaryField.style.left = "-9999px";
      document.body.appendChild(temporaryField);
      temporaryField.select();
      document.execCommand("copy");
      document.body.removeChild(temporaryField);
    }

    elements.copyFeedback.textContent = "Chave Pix copiada.";
  } catch {
    elements.copyFeedback.textContent = "Não foi possível copiar automaticamente. Selecione a chave e copie manualmente.";
  }
}

function resetFilters() {
  elements.catalogControls.reset();
  renderCatalog();
}

function toggleResidentMode() {
  appState.residentModeEnabled = !appState.residentModeEnabled;
  elements.residentToggle.setAttribute("aria-pressed", String(appState.residentModeEnabled));
  elements.residentToggle.textContent = appState.residentModeEnabled
    ? "Sair do modo moradores local"
    : "Modo moradores local";
  document.body.classList.toggle("resident-mode", appState.residentModeEnabled);
  renderCatalog();
}

function updateSupportLinks() {
  const supportMessage = "Oi! Vim pelo site do Nosso Apê e tenho uma dúvida sobre um presente.";
  const supportUrl = buildWhatsAppUrl(APP_CONFIG.whatsappNumber, supportMessage);

  elements.whatsappSupportLink.href = supportUrl;
  elements.publicationWhatsappLink.href = supportUrl;
}

function bindCatalogEvents() {
  elements.catalogControls.addEventListener("input", renderCatalog);
  elements.catalogControls.addEventListener("change", renderCatalog);
  elements.clearFiltersButton.addEventListener("click", resetFilters);
  elements.residentToggle.addEventListener("click", toggleResidentMode);
  elements.resetDataButton.addEventListener("click", () => {
    const confirmed = window.confirm("Isso vai limpar os registros locais deste navegador, incluindo status e contribuições simuladas. Deseja continuar?");

    if (!confirmed) {
      return;
    }

    clearLocalData();
    renderCatalog();
  });

  elements.productsList.addEventListener("change", (event) => {
    const statusSelect = event.target.closest("[data-status-product-id]");

    if (!statusSelect) {
      return;
    }

    updateProductStatus(statusSelect.dataset.statusProductId, statusSelect.value);
    renderCatalog();
  });

  elements.productsList.addEventListener("click", (event) => {
    const giftButton = event.target.closest(".gift-button");

    if (!giftButton || giftButton.disabled) {
      return;
    }

    openModal(getSelectedProduct(giftButton.dataset.productId));
  });
}

function bindModalEvents() {
  elements.closeModalButton.addEventListener("click", closeModal);
  elements.copyPixButton.addEventListener("click", copyPixKey);
  elements.backButton.addEventListener("click", () => updateModalStep("details"));
  elements.paymentConfirmation.addEventListener("change", setPrimaryButtonState);
  elements.giftForm.addEventListener("change", updateContributionField);

  elements.giftModal.addEventListener("click", (event) => {
    if (event.target === elements.giftModal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.giftModal.classList.contains("is-open")) {
      closeModal();
    }
  });

  elements.giftForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (appState.currentStep === "details") {
      preparePixStep();
      return;
    }

    if (appState.currentStep === "pix") {
      registerSimulatedPayment();
      return;
    }

    if (appState.currentStep === "success") {
      openWhatsApp(buildWhatsAppMessage());
      closeModal();
    }
  });
}

function initializeStaticTexts() {
  elements.pixKey.textContent = APP_CONFIG.pix.key;
  elements.pixType.textContent = APP_CONFIG.pix.type;
  elements.pixReceiver.textContent = APP_CONFIG.pix.receiver;
  elements.successMessage.textContent = APP_CONFIG.finalGiftMessage;
  updateSupportLinks();
}

function bootstrap() {
  populateCategoryFilter();
  initializeStaticTexts();
  renderCatalog();
  bindCatalogEvents();
  bindModalEvents();
}

bootstrap();
