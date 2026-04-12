// --- CONFIGURACIÓN SUPABASE ---
const SUBAPASE_URL = "https://urbxknlrzokdsbyhfirl.supabase.co";
const SUPABASE_KEY = "sb_publishable_q7SZ54CZAxK8naqTf8gWJg_UViEPakb";
const _supabase = supabase.createClient(SUBAPASE_URL, SUPABASE_KEY);

// --- GESTIÓN DE SESIÓN ---
window.logout = function() {
    sessionStorage.clear();
    location.reload();
};

const loginOverlay = document.getElementById('loginOverlay');
const mainContent = document.getElementById('mainContent');
const userStatusBar = document.getElementById('userStatus');
const loggedUserName = document.getElementById('loggedUserName');

// Verificar sesión al cargar
if (sessionStorage.getItem('userRegistered')) {
    loginOverlay.classList.add('hidden');
    mainContent.classList.remove('content-hidden');
    document.querySelectorAll('.container').forEach(c => c.classList.remove('content-hidden'));
    
    if (userStatusBar) userStatusBar.classList.remove('content-hidden');
    if (loggedUserName) loggedUserName.textContent = sessionStorage.getItem('userName') || "Usuario";
    
    setTimeout(cargarPublicaciones, 500); 
}

function hideLogin(name, legajo) {
    if (name) sessionStorage.setItem('userName', name);
    if (legajo) sessionStorage.setItem('userLegajo', legajo);
    sessionStorage.setItem('userRegistered', 'true');
    
    loginOverlay.classList.add('hidden');
    mainContent.classList.remove('content-hidden');
    document.querySelectorAll('.container').forEach(c => c.classList.remove('content-hidden'));
    
    if (userStatusBar) userStatusBar.classList.remove('content-hidden');
    if (loggedUserName) loggedUserName.textContent = sessionStorage.getItem('userName') || "Usuario";
    
    cargarPublicaciones();
}

// --- LOGIN Y REGISTRO ---
window.switchLoginView = function(view) {
  const loginView = document.getElementById('loginView');
  const registerView = document.getElementById('registerView');
  if (view === 'register') {
    loginView.classList.add('hidden');
    registerView.classList.remove('hidden');
  } else {
    loginView.classList.remove('hidden');
    registerView.classList.add('hidden');
  }
};

const btnIngresar = document.getElementById('btnIngresar');
if (btnIngresar) {
  btnIngresar.onclick = async () => {
    const legajo = document.getElementById('logLegajo').value.trim();
    const password = document.getElementById('logPassword').value.trim();

    if (!legajo || !password) {
      alert('Por favor, ingresá Legajo y Contraseña.');
      return;
    }

    btnIngresar.disabled = true;
    btnIngresar.textContent = 'Verificando...';

    try {
      const { data: user, error: fetchError } = await _supabase
        .from('afiliados')
        .select('*')
        .eq('legajo', legajo)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!user) {
        alert('❌ Error: El Legajo "' + legajo + '" no está registrado.\n\nPor favor, hacé clic en "Crear Cuenta" primero.');
      } else if (user.password !== password) {
        alert('❌ Error: La contraseña es incorrecta.');
      } else {
        hideLogin(user.nombre, user.legajo);
      }
    } catch (err) {
      console.error("Error en login:", err);
      alert('Error de conexión: ' + err.message);
    } finally {
      btnIngresar.disabled = false;
      btnIngresar.textContent = 'Ingresar';
    }
  };
}

const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.onsubmit = async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('regNombre').value.trim();
        const legajo = document.getElementById('regLegajo').value.trim();
        const password = document.getElementById('regPassword').value.trim();
        const passwordConfirm = document.getElementById('regPasswordConfirm').value.trim();

        if (password !== passwordConfirm) {
            alert('Error: Las contraseñas no coinciden.');
            return;
        }

        const btn = registerForm.querySelector('.login-btn');
        btn.disabled = true;
        btn.textContent = 'Creando cuenta...';

        try {
            const { data: existing } = await _supabase.from('afiliados').select('legajo').eq('legajo', legajo).maybeSingle();
            if (existing) {
                alert('Error: Ya existe una cuenta con este legajo.');
            } else {
                const { error: insertError } = await _supabase.from('afiliados').insert([{ nombre, legajo, password }]);
                if (insertError) throw insertError;
                hideLogin(nombre, legajo);
            }
        } catch (err) {
            console.error(err);
            alert('Error al crear cuenta: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Registrarse';
        }
    };
}

// --- LÓGICA DEL MURO (AQUABOOK) ---
const postForm = document.getElementById('postForm');
const postsList = document.getElementById('postsList');
const postImageInput = document.getElementById('postImage');
const imagePreview = document.getElementById('imagePreview');

async function cargarPublicaciones() {
    if (!postsList) return;
    postsList.innerHTML = '<p style="color: var(--text-muted); text-align: center;">⏳ Cargando muro...</p>';
    
    try {
        const { data, error } = await _supabase.from('publicaciones').select('*').order('created_at', { ascending: false });
        if (error) throw error;

        postsList.innerHTML = '';
        if (!data || data.length === 0) {
            postsList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">📭 El muro está vacío. ¡Escribe algo!</p>';
            return;
        }

        data.forEach(post => {
            const dateObj = new Date(post.created_at);
            const date = dateObj.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
            const currentLegajo = sessionStorage.getItem('userLegajo');
            
            const postHtml = `
            <div class="post-item">
                <div class="post-header">
                <div class="post-header-text">
                    <span class="post-user">${post.nombre} - Legajo: ${post.legajo}</span>
                    <span class="post-date">${date}</span>
                </div>
                <img src="photos/${post.legajo}.jpg" class="post-header-photo" onerror="this.style.display='none'">
                </div>
                <div class="post-content">${post.mensaje}</div>
                ${post.imagen_url ? `<img src="${post.imagen_url}" class="post-image" alt="Imagen post" onclick="reaccionar('${post.id}', 'encantos', ${post.encantos})" style="cursor: pointer;">` : ''}
                
                <div class="post-actions">
                <button class="reaction-btn" onclick="reaccionar('${post.id}', 'likes', ${post.likes})">
                    👍 Me gusta <span>${post.likes || 0}</span>
                </button>
                <button class="reaction-btn" onclick="reaccionar('${post.id}', 'encantos', ${post.encantos})">
                    ❤️ Me encanta <span>${post.encantos || 0}</span>
                </button>
                ${currentLegajo == post.legajo ? `
                    <button class="delete-btn" onclick="borrarPost('${post.id}')">🗑️ Borrar</button>
                ` : ''}
                </div>
            </div>
            `;
            postsList.insertAdjacentHTML('beforeend', postHtml);
        });
    } catch (err) {
        postsList.innerHTML = '<p style="color: #f43f5e; text-align: center;">Error: ' + err.message + '</p>';
    }
}

async function reaccionar(id, campo, valorActual) {
    const reactionKey = `reacted_${id}_${campo}`;
    if (sessionStorage.getItem(reactionKey)) {
        console.log("Ya has reaccionado a esta publicación.");
        return;
    }

    try {
        const updates = {};
        updates[campo] = (valorActual || 0) + 1;
        sessionStorage.setItem(reactionKey, 'true');
        await _supabase.from('publicaciones').update(updates).eq('id', id);
        cargarPublicaciones();
    } catch (e) { console.error(e); }
}

async function borrarPost(id) {
    if (!confirm('¿Seguro que quieres borrar esta publicación?')) return;
    try {
        await _supabase.from('publicaciones').delete().eq('id', id);
        cargarPublicaciones();
    } catch (e) { console.error(e); }
}

function redimensionarImagen(base64Str, maxWidth = 1024) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
    });
}

if (postImageInput) {
    postImageInput.onchange = () => {
        const file = postImageInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.innerHTML = `<img src="${e.target.result}" style="max-height: 100px; border-radius: 5px;">`;
            };
            reader.readAsDataURL(file);
        }
    };
}

if (postForm) {
    postForm.onsubmit = async (e) => {
        e.preventDefault();
        const btn = postForm.querySelector('button');
        const txt = document.getElementById('postText');
        const nombre = sessionStorage.getItem('userName') || "Usuario";
        const legajo = sessionStorage.getItem('userLegajo') || "0";

        btn.disabled = true;
        btn.textContent = 'Enviando...';
        let imagenBase64 = null;
        const file = postImageInput.files[0];
        
        if (file) {
            const rawBase64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
            imagenBase64 = await redimensionarImagen(rawBase64);
        }

        if (!txt.value.trim() && !imagenBase64) {
            alert('Por favor, escribe algo o sube una foto.');
            btn.disabled = false;
            btn.textContent = 'Publicar';
            return;
        }

        try {
            const { error } = await _supabase.from('publicaciones').insert([{ nombre, legajo, mensaje: txt.value.trim() || "", imagen_url: imagenBase64 }]);
            if (error) throw error;
            txt.value = '';
            postImageInput.value = '';
            imagePreview.innerHTML = '';
            cargarPublicaciones();
        } catch (err) {
            console.error(err);
            alert('Error al publicar: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Publicar';
        }
    };
}
