// DADOS SIMULADOS (MOCK)
let usuarioAtual = null;

// ESTADOS DA INTERFACE
let modoVisualizacao = 'mes'; // 'mes' ou 'semana'
let categoriasAtivas = {
  aula: true,
  prova: true,
  feriado: true,
  atividade: true,
  vaga: true
};

const eventosMock = [
  { id: '1', dia: 3, titulo: '07:30 Matemática', tipo: 'aula' },
  { id: '2', dia: 4, titulo: '10:00 Português', tipo: 'aula' },
  { id: '3', dia: 12, titulo: '07:30 Prova de Matemática', tipo: 'prova' },
  { id: '4', dia: 14, titulo: '08:00 Feira de Ciências', tipo: 'atividade' },
  { id: '5', dia: 18, titulo: '10:00 Prova de Português', tipo: 'prova' },
  { id: '6', dia: 20, titulo: 'Feriado Municipal', tipo: 'feriado' },
  { id: '7', dia: 25, titulo: '⚡ AULA VAGA: História', tipo: 'vaga' }
];

// ELEMENTOS DO DOM
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app');
const formLogin = document.getElementById('form-login');
const userRoleBadge = document.getElementById('user-role-badge');
const userNameDisplay = document.getElementById('user-name-display');
const btnLogout = document.getElementById('btn-logout');
const calendarBody = document.getElementById('calendar-body');
const btnThemeToggle = document.getElementById('btn-theme-toggle');
const btnViewMes = document.getElementById('btn-view-mes');
const btnViewSemana = document.getElementById('btn-view-semana');

// 1. INICIALIZAÇÃO E LOGIN
formLogin.addEventListener('submit', (e) => {
  e.preventDefault();
  const nome = document.getElementById('login-nome').value;
  const papel = document.getElementById('login-papel').value;

  usuarioAtual = { nome, papel };

  userNameDisplay.textContent = nome;
  userRoleBadge.textContent = papel;

  loginScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');

  configurarPermissoesPorPapel(papel);
  renderizarCalendario();
});

btnLogout.addEventListener('click', () => {
  usuarioAtual = null;
  appScreen.classList.add('hidden');
  loginScreen.classList.remove('hidden');
});

// 2. ALTERNAR TEMA DIURNO / NOTURNO (🌙 / ☀️)
btnThemeToggle.addEventListener('click', () => {
  document.body.classList.toggle('light-mode');
  const isLight = document.body.classList.contains('light-mode');
  btnThemeToggle.textContent = isLight ? '☀️' : '🌙';
});

// 3. ALTERNANÇA DE VISUALIZAÇÃO (MÊS / SEMANA)
btnViewMes.addEventListener('click', () => {
  modoVisualizacao = 'mes';
  btnViewMes.classList.add('active');
  btnViewSemana.classList.remove('active');
  renderizarCalendario();
});

btnViewSemana.addEventListener('click', () => {
  modoVisualizacao = 'semana';
  btnViewSemana.classList.add('active');
  btnViewMes.classList.remove('active');
  renderizarCalendario();
});

// 4. FILTRO DE CATEGORIAS POR CHECKBOX
document.querySelectorAll('#category-filters input[type="checkbox"]').forEach(checkbox => {
  checkbox.addEventListener('change', (e) => {
    const categoria = e.target.getAttribute('data-cat');
    categoriasAtivas[categoria] = e.target.checked;
    renderizarCalendario();
  });
});

// 5. RENDERIZAÇÃO DO CALENDÁRIO COM FILTROS ATIVOS
function renderizarCalendario() {
  calendarBody.innerHTML = '';

  let diaInicial = 1;
  let diaFinal = 31;
  let offsetInicio = 6; // Agosto/2026 inicia no Sábado

  // Caso altere para visualização de semana
  if (modoVisualizacao === 'semana') {
    diaInicial = 30;
    diaFinal = 31;
    offsetInicio = 0;
  }

  // Preenche espaços no início no modo Mês
  if (modoVisualizacao === 'mes') {
    for (let i = 0; i < offsetInicio; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'day-cell empty';
      emptyCell.style.opacity = '0.2';
      calendarBody.appendChild(emptyCell);
    }
  }

  // Renderiza dias
  for (let dia = diaInicial; dia <= diaFinal; dia++) {
    const dayCell = document.createElement('div');
    dayCell.className = `day-cell ${dia === 31 ? 'current-day' : ''}`;
    dayCell.innerHTML = `<div class="day-number">${dia}</div>`;

    // Aplica o filtro de categorias
    const eventosFiltrados = eventosMock.filter(evt => {
      const bateComDia = evt.dia === dia;
      const categoriaAtiva = categoriasAtivas[evt.tipo] !== false;
      return bateComDia && categoriaAtiva;
    });

    eventosFiltrados.forEach(evt => {
      const evtDiv = document.createElement('div');
      evtDiv.className = `event-item event-${evt.tipo}`;
      evtDiv.textContent = evt.titulo;
      evtDiv.onclick = () => interagirComEvento(evt);
      dayCell.appendChild(evtDiv);
    });

    calendarBody.appendChild(dayCell);
  }
}

// 6. PERMISSÕES DE ACESSO
function configurarPermissoesPorPapel(papel) {
  document.querySelectorAll('.actions-group button').forEach(btn => btn.classList.add('hidden'));

  if (papel === 'aluno') {
    document.getElementById('btn-feedback')?.classList.remove('hidden');
  } else if (papel === 'professor') {
    document.getElementById('btn-novo-evento')?.classList.remove('hidden');
    document.getElementById('btn-pegar-aula')?.classList.remove('hidden');
  } else if (papel === 'gestor') {
    document.getElementById('btn-novo-evento')?.classList.remove('hidden');
    document.getElementById('btn-aprovar-trocas')?.classList.remove('hidden');
    document.getElementById('btn-bloquear-horario')?.classList.remove('hidden');
  } else if (papel === 'admin') {
    document.querySelectorAll('.actions-group button').forEach(btn => btn.classList.remove('hidden'));
  }
}

// 7. MODAIS E INTERAÇÕES
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
document.getElementById('modal-close').onclick = () => modal.classList.add('hidden');

function abrirModal(titulo, htmlConteudo) {
  modalTitle.textContent = titulo;
  modalBody.innerHTML = htmlConteudo;
  modal.classList.remove('hidden');
}

function interagirComEvento(evt) {
  alert(`Evento: ${evt.titulo}`);
}