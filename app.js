const SUBAPASE_URL = "https://urbxknlrzokdsbyhfirl.supabase.co";
const SUPABASE_KEY = "sb_publishable_q7SZ54CZAxK8naqTf8gWJg_UViEPakb";
const _supabase = supabase.createClient(SUBAPASE_URL, SUPABASE_KEY);

let db = null;
const searchInput = document.getElementById('searchInput');
const resultsBody = document.getElementById('resultsBody');
const loader = document.getElementById('loader');

// Prevent searching before initialization
searchInput.disabled = true;
searchInput.placeholder = "Cargando base de datos...";

/**
 * Inicia SQLite y descarga la base de datos a memoria
 */
async function initDB() {
  try {
    // Inicializar sql.js
    const config = {
      // Usar uncdn para descargar el binario de wasm
      locateFile: filename => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${filename}`
    };

    loader.classList.remove('hidden');
    const SQL = await initSqlJs(config);
    console.log("SQL.js inicializado");

    // Convert Base64 string from dbData.js to Uint8Array directly
    const binary_string = window.atob(DB_BASE64);
    const len = binary_string.length;
    const uInt8Array = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      uInt8Array[i] = binary_string.charCodeAt(i);
    }

    // Cargar la DB localmente
    db = new SQL.Database(uInt8Array);

    // Configurar la interfaz
    searchInput.disabled = false;
    searchInput.placeholder = "Ej: Perez, Juan, o 1234...";
    loader.classList.add('hidden');

    // Iniciar con búsqueda vacía o mostrar cantidad
    const res = db.exec("SELECT COUNT(*) FROM persona");
    if (res.length > 0) {
      console.log(`Cargados ${res[0].values[0][0]} registros.`);
    }
    // Ocultar tabla al inicio
    document.querySelector('.table-glass').style.display = 'none';

  } catch (err) {
    console.error(err);
    searchInput.placeholder = "Error al cargar DB. Avisa al desarrollador.";
    loader.classList.add('hidden');
  }
}

/**
 * Busca en la base de datos
 */
function search(query) {
  if (!db) return;

  const q = query.trim().toLowerCase();
  document.getElementById('lastHeader').textContent = 'Sector';

  if (q.length === 0) {
    document.querySelector('.table-glass').style.display = 'none';
    resultsBody.innerHTML = '';
    return;
  }
  document.querySelector('.table-glass').style.display = '';

  // Palabra clave "todos" = mostrar toda la base de datos
  if (q === 'todos') {
    try {
      const allResults = db.exec("SELECT legajo, apellido, nombre, lugar, sector FROM persona ORDER BY apellido, nombre");
      let html = '';
      if (allResults.length > 0) {
        for (const row of allResults[0].values) {
          const [legajo, apellido, nombre, lugar, sector] = row;
          const nombreCompleto = `${apellido}, ${nombre}`;
          const fotoPath = `photos/${legajo}.jpg`;
          html += `
            <tr class="clickable-row">
              <td style="vertical-align: middle;">
                <img src="${fotoPath}" class="avatar" 
                     onerror="this.src='https://ui-avatars.com/api/?name=${apellido}+${nombre}&background=random&color=fff&size=128'"
                     onclick="event.stopPropagation(); abrirModalFoto('${fotoPath}')">
              </td>
              <td style="vertical-align: middle;" onclick="abrirVotacion('${nombreCompleto}', ${legajo})"><strong>${String(legajo).trim() === '0' ? '-' : legajo}</strong></td>
              <td style="vertical-align: middle;" onclick="abrirVotacion('${nombreCompleto}', ${legajo})">${nombreCompleto}</td>
              <td style="vertical-align: middle;" onclick="abrirVotacion('${nombreCompleto}', ${legajo})">${lugar || '-'}</td>
              <td style="vertical-align: middle;" onclick="abrirVotacion('${nombreCompleto}', ${legajo})">${sector || '-'}</td>
            </tr>
          `;
        }
      }
      resultsBody.innerHTML = html || '<tr><td colspan="5" class="text-center">No hay registros.</td></tr>';
    } catch (e) { console.error(e); }
    return;
  }

  // Prevenir inyeccion SQL escapando el query con prepare statements
  try {
    const likeQuery = `%${q}%`;
    const sqlStr = `
      SELECT legajo, apellido, nombre, lugar, sector 
      FROM persona 
      WHERE 
        LOWER(apellido) LIKE $query OR 
        LOWER(nombre) LIKE $query OR 
        CAST(legajo AS TEXT) LIKE $query
      LIMIT 100
    `;

    const stmt = db.prepare(sqlStr);
    stmt.bind({ $query: likeQuery });

    let html = '';
    let count = 0;
    while (stmt.step()) {
      const row = stmt.getAsObject();
      const nombreCompleto = `${row.apellido}, ${row.nombre}`;
      const fotoPath = `photos/${row.legajo}.jpg`;

      html += `
        <tr class="clickable-row">
          <td style="vertical-align: middle;">
            <img src="${fotoPath}" class="avatar" 
                 onerror="this.src='https://ui-avatars.com/api/?name=${row.apellido}+${row.nombre}&background=random&color=fff&size=128'"
                 onclick="event.stopPropagation(); abrirModalFoto('${fotoPath}')">
          </td>
          <td style="vertical-align: middle;" onclick="abrirVotacion('${nombreCompleto}', ${row.legajo})"><strong>${String(row.legajo).trim() === '0' ? '-' : row.legajo}</strong></td>
          <td style="vertical-align: middle;" onclick="abrirVotacion('${nombreCompleto}', ${row.legajo})">${nombreCompleto}</td>
          <td style="vertical-align: middle;" onclick="abrirVotacion('${nombreCompleto}', ${row.legajo})">${row.lugar || '-'}</td>
          <td style="vertical-align: middle;" onclick="abrirVotacion('${nombreCompleto}', ${row.legajo})">${row.sector || '-'}</td>
        </tr>
      `;
      count++;
    }
    stmt.free();

    if (count === 0) {
      html = `
        <tr>
          <td colspan="5" class="text-center" style="color: var(--text-muted);">
            No se encontraron resultados para "${query}".
          </td>
        </tr>
      `;
    }

    resultsBody.innerHTML = html;

  } catch (e) {
    console.error(e);
  }
}

// Debouncing para no saturar 
let debounceTimer;
searchInput.addEventListener('input', (e) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    search(e.target.value);
  }, 200); // 200ms
});

// Arrancar al cargar la página
window.addEventListener('load', initDB);



// Lógica de Pestañas de Excel
function renderizarCandidatos(resultados, listaNombre) {
  if (resultados.length === 0) {
    resultsBody.innerHTML = `<tr><td colspan="5" class="text-center">No hay candidatos en la ${listaNombre}</td></tr>`;
    return;
  }

  let html = '';
  for (const row of resultados) {
    const fotoPath = `photos/${row.Legajo}.jpg`;
    html += `
        <tr class="clickable-row">
          <td style="vertical-align: middle;">
            <img src="${fotoPath}" class="avatar" 
                 onerror="this.src='https://ui-avatars.com/api/?name=${row.Nombre}&background=random&color=fff&size=128'"
                 onclick="event.stopPropagation(); abrirModalFoto('${fotoPath}')">
          </td>
          <td style="vertical-align: middle;" onclick="abrirVotacion('${row.Nombre}', ${row.Legajo})"><strong>${String(row.Legajo).trim() === '0' ? '-' : row.Legajo}</strong></td>
          <td style="vertical-align: middle;" onclick="abrirVotacion('${row.Nombre}', ${row.Legajo})">${row.Nombre}</td>
          <td style="vertical-align: middle;" onclick="abrirVotacion('${row.Nombre}', ${row.Legajo})"><span style="color:var(--text-muted); font-size:12px;">Cargo:</span><br>${row.Cargo || '-'}</td>
          <td style="vertical-align: middle;" onclick="abrirVotacion('${row.Nombre}', ${row.Legajo})">${row.Lista}</td>
        </tr>
      `;
  }
  resultsBody.innerHTML = html;
}

function filtrarCandidatos(lista) {
  searchInput.value = '';

  // Mostrar la tabla
  document.querySelector('.table-glass').style.display = '';
  document.getElementById('lastHeader').textContent = 'Lista';

  // Cambiar color de fondo del cuadro según la lista
  const tableGlass = document.querySelector('.table-glass');
  const colores = {
    'Verde': 'rgba(16, 185, 129, 0.25)',
    'Azul': 'rgba(59, 130, 246, 0.25)',
    'Celeste y Blanca': 'rgba(6, 182, 212, 0.25)'
  };
  const bordes = {
    'Verde': 'rgba(16, 185, 129, 0.5)',
    'Azul': 'rgba(59, 130, 246, 0.5)',
    'Celeste y Blanca': 'rgba(6, 182, 212, 0.5)'
  };
  tableGlass.style.background = colores[lista] || '';
  tableGlass.style.borderColor = bordes[lista] || '';

  // Clonar los candidatos para no afectar el array original al inyectarles la data de la DB
  const candidatosFiltrados = CANDIDATOS_DATA.filter(c => c.Lista === lista).map(c => ({ ...c }));

  if (db) {
    try {
      for (let c of candidatosFiltrados) {
        // Consultar el nombre real de afiliado a la DB local
        const stmt = db.prepare("SELECT apellido, nombre FROM persona WHERE legajo = ?");
        stmt.bind([c.Legajo]);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          c.Nombre = `${row.apellido}, ${row.nombre}`;
        }
        stmt.free();
      }
    } catch (e) {
      console.log('No se pudo embellecer los nombres desde la DB', e);
    }
  }

  renderizarCandidatos(candidatosFiltrados, lista);
}

function limpiarCandidatos() {
  location.reload();
}

// =============================================
// SISTEMA DE CIÓN - BOCA DE URNA
// =============================================

const voteModal = document.getElementById('voteModal');
const voteAffiliateName = document.getElementById('voteAffiliateName');
const closeVoteModal = document.getElementById('closeVoteModal');
const voteConfirmation = document.getElementById('voteConfirmation');

let currentVoteLegajo = null;

async function getVotosGlobales() {
  try {
    const { data, error } = await _supabase.from('votos').select('*');
    if (error) throw error;
    
    const votos = { 'Verde': 0, 'Azul': 0, 'Celeste y Blanca': 0, votantes: [] };
    data.forEach(voto => {
      if (votos[voto.lista] !== undefined) votos[voto.lista]++;
      votos.votantes.push(String(voto.legajo));
    });
    return votos;
  } catch (err) {
    console.error("Error cargando votos:", err);
    return { 'Verde': 0, 'Azul': 0, 'Celeste y Blanca': 0, votantes: [] };
  }
}

async function abrirVotacion(nombre, legajo) {
  currentVoteLegajo = legajo;
  voteAffiliateName.textContent = nombre + (String(legajo).trim() !== '0' ? ' (Legajo: ' + legajo + ')' : '');
  voteConfirmation.classList.add('hidden');
  
  // Verificar si ya votó (Consultar DB)
  const votos = await getVotosGlobales();
  const voteButtons = document.querySelector('.vote-buttons');
  if (votos.votantes.includes(String(legajo))) {
    voteButtons.style.display = 'none';
    voteConfirmation.textContent = '⚠️ Este afiliado ya registró su voto.';
    voteConfirmation.classList.remove('hidden');
  } else {
    voteButtons.style.display = 'flex';
  }
  
  voteModal.classList.remove('hidden');
}

async function registrarVoto(lista) {
  try {
    const { error } = await _supabase.from('votos').insert([
      { lista: lista, legajo: String(currentVoteLegajo) }
    ]);
    if (error) throw error;

    // Mostrar confirmación
    const voteButtons = document.querySelector('.vote-buttons');
    voteButtons.style.display = 'none';
    voteConfirmation.textContent = '✅ ¡Voto registrado para ' + lista + '!';
    voteConfirmation.classList.remove('hidden');
    
    // Actualizar barras
    actualizarResultados();
    
    // Cerrar modal después de 1.5s
    setTimeout(() => {
      voteModal.classList.add('hidden');
    }, 1500);
  } catch (err) {
    alert("Error al registrar voto: " + err.message);
  }
}

async function actualizarResultados() {
  const votos = await getVotosGlobales();
  const total = votos['Verde'] + votos['Azul'] + votos['Celeste y Blanca'];

  const pctVerde = total > 0 ? ((votos['Verde'] / total) * 100).toFixed(1) : 0;
  const pctAzul = total > 0 ? ((votos['Azul'] / total) * 100).toFixed(1) : 0;
  const pctCeleste = total > 0 ? ((votos['Celeste y Blanca'] / total) * 100).toFixed(1) : 0;

  document.getElementById('barVerde').style.width = pctVerde + '%';
  document.getElementById('barAzul').style.width = pctAzul + '%';
  document.getElementById('barCeleste').style.width = pctCeleste + '%';

  document.getElementById('countVerde').textContent = votos['Verde'] + ' (' + pctVerde + '%)';
  document.getElementById('countAzul').textContent = votos['Azul'] + ' (' + pctAzul + '%)';
  document.getElementById('countCeleste').textContent = votos['Celeste y Blanca'] + ' (' + pctCeleste + '%)';

  document.getElementById('totalVotos').textContent = 'Total de votos: ' + total;
}

async function resetearVotos() {
  if (confirm('¿Estás seguro de que querés borrar TODOS los votos de la base de datos?')) {
    const { error } = await _supabase.from('votos').delete().neq('id', 0);
    if (!error) actualizarResultados();
  }
}

closeVoteModal.onclick = function () {
  voteModal.classList.add('hidden');
}

voteModal.onclick = function (e) {
  if (e.target === voteModal) {
    voteModal.classList.add('hidden');
  }
}

// =============================================
// MODAL DE FOTO
// =============================================
const imageModal = document.getElementById('imageModal');
const imgFull = document.getElementById('imgFull');
const closeImageModal = document.getElementById('closeImageModal');

let imageModalTimer = null;

function abrirModalFoto(src) {
  imgFull.src = src;
  imageModal.classList.remove('hidden');

  // Cerrar automáticamente después de 2.5 segundos
  if (imageModalTimer) clearTimeout(imageModalTimer);
  imageModalTimer = setTimeout(() => {
    imageModal.classList.add('hidden');
  }, 2500);
}

closeImageModal.onclick = () => imageModal.classList.add('hidden');
imageModal.onclick = (e) => {
  if (e.target === imageModal) imageModal.classList.add('hidden');
};

// Cargar resultados al inicio
actualizarResultados();
