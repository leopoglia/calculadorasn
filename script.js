document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURAÇÃO DAS APIs ---
    const API_BASE_URL = 'https://api-qa.recuperatax.app.br/api/v1';
    const API_CNPJ_URL = 'https://receitaws.com.br/v1/cnpj/';

    // --- SELEÇÃO DOS ELEMENTOS DO DOM ---
    const form = document.getElementById('calculator-form');
    const cnpjInput = document.getElementById('cnpj');
    const razaoSocialInput = document.getElementById('razaoSocial');
    const faturamentoInput = document.getElementById('faturamento');
    const segmentoSelect = document.getElementById('segmento');
    const cnpjSpinner = document.getElementById('cnpj-spinner');
    const calculateButton = document.getElementById('calculate-button');
    const resultadoModal = document.getElementById('resultadoModal');
    const logoModal = document.getElementById('logoModal');
    const valorRecuperarFormatadoEl = document.getElementById('valorRecuperarFormatado');
    const abrirModalLogoBtn = document.getElementById('abrirModalLogo');
    const baixarContratoFinalBtn = document.getElementById('baixarContratoFinal');
    const logoUploader = document.getElementById('logoUploader');
    const fileInput = document.getElementById('fileInput');
    const logoPreview = document.getElementById('logoPreview');
    const logoPlaceholder = document.getElementById('logoPlaceholder');
    const toastContainer = document.getElementById('toast-container');

    let data = {
        cnpj: "", razaoSocial: "", faturamento: 0, meses: 0, segmento: "",
        segregacao: false, porcentagemMediaSegregacao: 0, teses: [], valorRBT12: 0,
        faixaAliquota: "", porcentagemAliquotaEfetivaComercio: 0, porcentagemPisCofinsComercio: 0,
        porcentagemMonofásico: 0, valorRecuperar: 0, valorRecuperarFormatado: "", impostoSemSegregacao: 0,
    };
    let imageUrl = '';
    const segmentoOptions = {
        "adegas": "Adegas e Com. de Bebidas", "agropecuaria": "Agropecuária",
        "autoeletrica": "Auto Elétrica e Mecânica", "autopecas": "Autopeças",
        "comercio_atacadista": "Comércio Atacadista", "comercio_pneus": "Comércio de Pneus",
        "farmaceutico": "Farmácias e Drogarias", "conveniencia": "Lojas de Conveniência e Lanchonetes",
        "mercados": "Mercados e Mercearias",
    };



    function showToast(message, type = 'error') { toastContainer.textContent = message; toastContainer.className = type; toastContainer.style.display = 'block'; setTimeout(() => { toastContainer.style.display = 'none'; }, 4000); }
    function populateSelect(selectElement, options) { if (!selectElement) return; selectElement.innerHTML = '<option value=""></option>'; for (const [value, label] of Object.entries(options)) { const option = document.createElement('option'); option.value = value; option.textContent = label; selectElement.appendChild(option); } }
    function cnpjMask(value) { if (!value) return ""; return value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1'); }
    function formatCurrency(event) { let input = event.target; let value = input.value.replace(/\D/g, ''); if (value === '') { input.value = ''; data.faturamento = 0; return; } const numberValue = parseFloat(value) / 100; data.faturamento = numberValue; input.value = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numberValue); }
    async function getCnpjData(cnpj) { const cnpjSoNumero = cnpj.replace(/\D/g, ''); if (cnpjSoNumero.length !== 14) return; cnpjSpinner.style.display = 'inline-block'; razaoSocialInput.value = 'Buscando...'; try { const proxyUrl = 'https://api.allorigins.win/get?url='; const targetUrl = encodeURIComponent(`${API_CNPJ_URL}${cnpjSoNumero}`); const response = await fetch(`${proxyUrl}${targetUrl}`); if (!response.ok) { throw new Error('Erro na rede ao buscar dados do CNPJ.'); } const jsonpData = await response.json(); const apiData = JSON.parse(jsonpData.contents); if (apiData.status === 'ERROR') { throw new Error(apiData.message); } data.razaoSocial = apiData.nome; razaoSocialInput.value = apiData.nome; } catch (error) { console.error("Erro ao buscar CNPJ:", error); showToast(`Erro ao buscar CNPJ`, 'error'); razaoSocialInput.value = ''; } finally { cnpjSpinner.style.display = 'none'; } }
    async function performCalculation(calculatorData) { calculateButton.disabled = true; calculateButton.textContent = 'Calculando...'; try { const response = await fetch(`${API_BASE_URL}/calculadora-tributaria/simples-nacional`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(calculatorData) }); if (!response.ok) { const errorData = await response.json().catch(() => null); const errorMessage = errorData?.message || `Erro ${response.status}: Não foi possível calcular.`; throw new Error(errorMessage); } return await response.json(); } finally { calculateButton.disabled = false; calculateButton.textContent = 'Calcular'; } }
    async function printPDF() { showToast('Preparando seu arquivo, aguarde...', 'info'); baixarContratoFinalBtn.disabled = true; baixarContratoFinalBtn.textContent = 'Baixando...'; const body = { data: data, approvals: [], type: "calculadora-simples", logo: imageUrl }; try { const response = await fetch(`${API_BASE_URL}/calculadora-tributaria/pdf`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!response.ok) throw new Error('Erro ao gerar o PDF.'); const blob = await response.blob(); const url = window.URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.setAttribute('download', 'Contrato de prestão de serviços - Diagnóstico Tributários.pdf'); document.body.appendChild(link); link.click(); document.body.removeChild(link); window.URL.revokeObjectURL(url); } catch (error) { console.error("Erro no download do PDF:", error); showToast(error.message, 'error'); } finally { baixarContratoFinalBtn.disabled = false; baixarContratoFinalBtn.textContent = 'Baixar Contrato com Logo'; } }

    cnpjInput.addEventListener('input', (e) => { e.target.value = cnpjMask(e.target.value); data.cnpj = e.target.value; if (e.target.value.length === 18) { getCnpjData(e.target.value); } });
    faturamentoInput.addEventListener('input', formatCurrency);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        data.meses = Number($('#meses').val());
        data.segmento = $('#segmento').val();

        if (!data.faturamento || data.faturamento <= 0) return showToast('Preencha o campo Faturamento');
        if (!data.meses || data.meses <= 0) return showToast('Preencha o campo Meses');
        if (!data.segmento) return showToast('Preencha o campo Segmento');

        try {
            const response = await performCalculation(data);
            if (response.valor_recuperar > 0) {
                Object.assign(data, response);
                const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(response.valor_recuperar);
                data.valorRecuperarFormatado = valorFormatado;
                valorRecuperarFormatadoEl.textContent = valorFormatado;
                resultadoModal.classList.add('active');
            } else {
                showToast('Não há valores a recuperar para este segmento.', 'info');
            }
        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    document.querySelectorAll('.modal-close-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.target.closest('.modal-overlay').classList.remove('active');
        });
    });

    logoUploader.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'image/png') {
            const reader = new FileReader();
            reader.onloadend = () => { imageUrl = reader.result; logoPreview.src = imageUrl; logoPreview.style.display = 'block'; logoPlaceholder.style.display = 'none'; };
            reader.readAsDataURL(file);
        } else {
            showToast('Formato de arquivo inválido. Por favor, selecione um arquivo PNG.');
        }
    });
    baixarContratoFinalBtn.addEventListener('click', printPDF);

    populateSelect(segmentoSelect, segmentoOptions);

    $(document).ready(function () {
        $('#segmento').select2({
            placeholder: "Selecione sua área de atuação",
            allowClear: true,
            minimumResultsForSearch: Infinity
        });
    });
});