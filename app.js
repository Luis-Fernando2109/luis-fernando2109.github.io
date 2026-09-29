// Configuração do Supabase
const SUPABASE_URL = 'https://zgdeowjpntycdonjtrrf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_eTFjTiqXh-d4g2ZBJpbXwQ_kweMq-YF';

// Inicializa a conexão
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ESTADO DA APLICAÇÃO
let usuarioAtual = null;
let eventosLista = [];
let modoVisualizacao = 'mes';
let categoriasAtivas = {
  aula: true,
  prova: true,
  feriado: true,
  atividade: true
};

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
const btnPegarAula = document.getElementById('btn-pegar-aula');

// MODAL
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
document.getElementById('modal-close').onclick = () => modal.classList.add('hidden');

// 1. LOGIN COM BANCO DE DADOS (PERFIS)
formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Pegamos os valores e removemos espaços extras
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value.trim();

  console.log('Tentando logar com:', email);

  // Busca o usuário na tabela 'perfis' do Supabase
  const { data: usuario, error } = await supabaseClient
    .from('perfis')
    .select('*')
    .eq('email', email)
    .eq('senha_hash', senha)
    .maybeSingle();

  if (error) {
    console.error('Erro retornado pelo Supabase:', error);
    alert('Erro no banco de dados: ' + error.message);
    return;
  }

  if (!usuario) {
    alert('Usuário não encontrado! Verifique se o e-mail e a senha estão corretos.');
    return;
  }

  // Se chegou aqui, o login deu certo!
  usuarioAtual = usuario;

  userNameDisplay.textContent = usuario.nome;
  userRoleBadge.textContent = usuario.papel;

  loginScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');

  configurarPermissoesPorPapel(usuario.papel);
  await carregarEventosDoBanco();
});

btnLogout.addEventListener('click', () => {
  usuarioAtual = null;
  appScreen.classList.add('hidden');
  loginScreen.classList.remove('hidden');
});

// 2. BUSCAR EVENTOS DO SUPABASE
async function carregarEventosDoBanco() {
  const { data, error } = await supabaseClient
    .from('eventos')
    .select('*');

  if (error) {
    console.error('Erro ao carregar eventos:', error);
    return;
  }

  eventosLista = data || [];
  renderizarCalendario();
}

// 3. RENDERIZAÇÃO DO CALENDÁRIO
function renderizarCalendario() {
  calendarBody.innerHTML = '';

  let diaInicial = 1;
  let diaFinal = 31;
  let offsetInicio = 6; // Agosto/2026

  if (modoVisualizacao === 'semana') {
    diaInicial = 30;
    diaFinal = 31;
    offsetInicio = 0;
  }

  if (modoVisualizacao === 'mes') {
    for (let i = 0; i < offsetInicio; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'day-cell empty';
      emptyCell.style.opacity = '0.2';
      calendarBody.appendChild(emptyCell);
    }
  }

  for (let dia = diaInicial; dia <= diaFinal; dia++) {
    const dayCell = document.createElement('div');
    dayCell.className = `day-cell ${dia === 31 ? 'current-day' : ''}`;
    dayCell.innerHTML = `<div class="day-number">${dia}</div>`;

    // Filtra eventos salvos no banco para o dia atual
    const eventosDoDia = eventosLista.filter(evt => {
      const dataEvt = new Date(evt.data_inicio);
      const diaEvt = dataEvt.getUTCDate();
      const categoriaAtiva = categoriasAtivas[evt.tipo] !== false;
      return diaEvt === dia && categoriaAtiva;
    });

    eventosDoDia.forEach(evt => {
      const evtDiv = document.createElement('div');
      const ehVaga = evt.vaga ? 'event-vaga' : `event-${evt.tipo}`;
      evtDiv.className = `event-item ${ehVaga}`;
      evtDiv.textContent = evt.vaga ? `⚡ VAGA: ${evt.titulo}` : evt.titulo;
      evtDiv.onclick = () => interagirComEvento(evt);
      dayCell.appendChild(evtDiv);
    });

    calendarBody.appendChild(dayCell);
  }
}

// 4. PEGAR AULA VAGA (REGISTRA SOLICITAÇÃO DE TROCA NO BANCO)
btnPegarAula?.addEventListener('click', async () => {
  // Busca aulas marcadas como VAGA no Supabase
  const { data: vagas, error } = await supabaseClient
    .from('eventos')
    .select('*')
    .eq('vaga', true);

  if (error || !vagas || vagas.length === 0) {
    abrirModal('Aulas Vagas', '<p>Não há aulas vagas disponíveis no momento.</p>');
    return;
  }

  let htmlConteudo = '<ul style="list-style:none; padding:0;">';
  vagas.forEach(vaga => {
    htmlConteudo += `
      <li style="margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
        <strong>${vaga.titulo}</strong><br>
        <small>Disciplina: ${vaga.disciplina || 'Geral'} | Turma: ${vaga.turma || 'N/A'}</small><br>
        <button class="btn btn-primary" style="margin-top:0.5rem;" onclick="solicitarAula('${vaga.id}')">Assumir esta Aula</button>
      </li>
    `;
  });
  htmlConteudo += '</ul>';

  abrirModal('Aulas Vagas Disponíveis', htmlConteudo);
});

async function solicitarAula(eventoId) {
  if (!usuarioAtual || usuarioAtual.papel !== 'professor') {
    alert('Apenas professores podem assumir aulas!');
    return;
  }

  // Cria um registro de solicitação na tabela 'solicitacoes_troca'
  const { error } = await supabaseClient
    .from('solicitacoes_troca')
    .insert([
      {
        evento_id: eventoId,
        professor_solicitante_id: usuarioAtual.id,
        status: 'pendente'
      }
    ]);

  if (error) {
    alert('Erro ao solicitar aula: ' + error.message);
  } else {
    alert('Solicitação enviada com sucesso! Aguardando aprovação do gestor.');
    modal.classList.add('hidden');
  }
}

// CONTROLES DE INTERFACE E TEMA
btnThemeToggle.addEventListener('click', () => {
  document.body.classList.toggle('light-mode');
  btnThemeToggle.textContent = document.body.classList.contains('light-mode') ? '☀️' : '🌙';
});

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

document.querySelectorAll('#category-filters input[type="checkbox"]').forEach(checkbox => {
  checkbox.addEventListener('change', (e) => {
    categoriasAtivas[e.target.getAttribute('data-cat')] = e.target.checked;
    renderizarCalendario();
  });
});

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

function abrirModal(titulo, htmlConteudo) {
  modalTitle.textContent = titulo;
  modalBody.innerHTML = htmlConteudo;
  modal.classList.remove('hidden');
}

function interagirComEvento(evt) {
  abrirModal('Detalhes do Evento', `
    <h4>${evt.titulo}</h4>
    <p>${evt.descricao || 'Sem descrição detalhada.'}</p>
    <p><strong>Tipo:</strong> ${evt.tipo}</p>
  `);
}