// --- CONFIGURACIÓN API BACKEND ---
const API_URL = "/api";

// --- GESTIÓN DE SESIÓN ---
window.logout = function () {
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
window.switchLoginView = function (view) {
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
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ legajo, password })
            });

            if (!response.ok) {
                if (response.status === 404) {
                    alert('❌ Error: El Legajo "' + legajo + '" no está registrado.\n\nPor favor, hacé clic en "Crear Cuenta" primero.');
                } else if (response.status === 401) {
                    alert('❌ Error: La contraseña es incorrecta.');
                } else {
                    const errData = await response.json();
                    alert('❌ Error: ' + errData.error);
                }
                return;
            }

            const user = await response.json();
            hideLogin(user.nombre, user.legajo);
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
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, legajo, password })
            });

            if (!response.ok) {
                const errData = await response.json();
                alert('Error: ' + errData.error);
                return;
            }

            const data = await response.json();
            hideLogin(data.nombre, data.legajo);
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

    try {
        const postsResponse = await fetch(`${API_URL}/posts`);
        if (!postsResponse.ok) throw new Error('Error al cargar publicaciones');
        const posts = await postsResponse.json();

        const commentsResponse = await fetch(`${API_URL}/comments`);
        if (!commentsResponse.ok) throw new Error('Error al cargar comentarios');
        const allComments = await commentsResponse.json();

        postsList.innerHTML = '';
        if (!posts || posts.length === 0) {
            postsList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">📭 El muro está vacío. ¡Escribe algo!</p>';
            return;
        }

        posts.forEach(post => {
            const dateObj = new Date(post.created_at);
            const date = dateObj.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
            const currentLegajo = sessionStorage.getItem('userLegajo');

            const postComments = allComments ? allComments.filter(c => c.post_id === post.id) : [];
            const commentsHtml = postComments.map(c => `
                <div class="comment-item">
                    <div class="comment-header">
                        <span class="comment-user">${c.nombre}</span>
                        <span class="comment-date">${new Date(c.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div class="comment-text">${c.mensaje}</div>
                </div>
            `).join('');

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

                <div class="comments-section">
                    <div id="comments-list-${post.id}">
                        ${commentsHtml}
                    </div>
                    <div class="comment-form">
                        <input type="text" id="comment-input-${post.id}" class="comment-input" placeholder="Comentar..." 
                               onkeydown="if(event.key === 'Enter') enviarComentario('${post.id}')">
                        <button class="comment-btn" onclick="enviarComentario('${post.id}')">Enviar</button>
                    </div>
                </div>
            </div>
            `;
            postsList.insertAdjacentHTML('beforeend', postHtml);
        });
    } catch (err) {
        postsList.innerHTML = '<p style="color: #f43f5e; text-align: center;">Error: ' + err.message + '</p>';
    }
}

async function enviarComentario(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const mensaje = input.value.trim();
    if (!mensaje) return;

    const nombre = sessionStorage.getItem('userName') || "Usuario";
    const legajo = sessionStorage.getItem('userLegajo') || "0";
    const btn = input.nextElementSibling;
    btn.disabled = true;

    try {
        const response = await fetch(`${API_URL}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ post_id: postId, nombre, legajo, mensaje })
        });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Error al comentar');
        }

        input.value = '';
        cargarPublicaciones();
    } catch (err) {
        console.error(err);
        alert('Error al comentar: ' + err.message);
    } finally {
        btn.disabled = false;
    }
}

async function reaccionar(id, campo, valorActual) {
    const reactionKey = `reacted_${id}_${campo}`;
    if (sessionStorage.getItem(reactionKey)) return;

    try {
        const nuevoValor = (valorActual || 0) + 1;
        sessionStorage.setItem(reactionKey, 'true');

        const response = await fetch(`${API_URL}/react`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, campo, valor: nuevoValor })
        });
        if (!response.ok) throw new Error('Error al registrar reacción');

        cargarPublicaciones();
    } catch (e) { console.error(e); }
}

async function borrarPost(id) {
    if (!confirm('¿Seguro que quieres borrar esta publicación?')) return;
    try {
        const response = await fetch(`${API_URL}/posts?id=${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Error al borrar publicación');
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

// --- CONFIGURACIÓN CLOUDINARY ---
const CLOUDINARY_CLOUD_NAME = "dfrukldlu"; // Reemplaza con tu Cloud Name de Cloudinary
const CLOUDINARY_UPLOAD_PRESET = "i2n7qmyh"; // Reemplaza con tu Upload Preset (Unsigned) de Cloudinary

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

        let imagenUrlFinal = null;

        // Si hay una foto seleccionada, la subimos primero a Cloudinary
        if (imagenBase64) {
            btn.textContent = 'Subiendo foto...';
            try {
                const formData = new FormData();
                formData.append('file', imagenBase64);
                formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

                const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                    method: 'POST',
                    body: formData
                });

                if (!cloudRes.ok) {
                    throw new Error('Error en la respuesta del servidor de imágenes');
                }

                const cloudData = await cloudRes.json();
                imagenUrlFinal = cloudData.secure_url; // Esta es la URL corta de Cloudinary
            } catch (err) {
                console.error("Cloudinary error:", err);
                alert('No se pudo subir la foto a Cloudinary. ¿Configuraste correctamente tu Cloud Name y Upload Preset?');
                btn.disabled = false;
                btn.textContent = 'Publicar';
                return;
            }
        }

        try {
            const response = await fetch(`${API_URL}/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    nombre, 
                    legajo, 
                    mensaje: txt.value.trim() || "", 
                    imagen_url: imagenUrlFinal // Guardamos la URL de Cloudinary en la base de datos
                })
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Error al publicar');
            }

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


// --- ACTUALIZACIÓN DE CONTENIDO (POLLING) ---
// Como Neon/Serverless no mantiene WebSockets directos en frontend de forma nativa,
// consultamos cambios cada 5 segundos para mantener el feed actualizado.
// Evitamos la recarga si el usuario está escribiendo para que no se le borre lo que tipea.
setInterval(() => {
    if (sessionStorage.getItem('userRegistered')) {
        const activeEl = document.activeElement;
        const estaEscribiendo = activeEl && (
            activeEl.id === 'postText' || 
            activeEl.classList.contains('comment-input')
        );

        if (!estaEscribiendo) {
            cargarPublicaciones();
        }
    }
}, 5000);

