const { neon } = require('@neondatabase/serverless');

// Inicializar la conexión a Neon usando la variable de entorno
const sql = neon(process.env.DATABASE_URL);

exports.handler = async (event, context) => {
    // Habilitar CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Manejar preflight OPTIONS
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const pathParts = event.path.split('/');
        const endpoint = pathParts[pathParts.length - 1] || '';
        const method = event.httpMethod;

        // --- RUTA: LOGIN ---
        if (endpoint === 'login' && method === 'POST') {
            const { legajo, password } = JSON.parse(event.body);
            const users = await sql`SELECT * FROM afiliados WHERE legajo = ${legajo} LIMIT 1`;
            if (users.length === 0) {
                return { statusCode: 404, headers, body: JSON.stringify({ error: 'Legajo no registrado' }) };
            }
            const user = users[0];
            if (user.password !== password) {
                return { statusCode: 401, headers, body: JSON.stringify({ error: 'Contraseña incorrecta' }) };
            }
            return { statusCode: 200, headers, body: JSON.stringify(user) };
        }

        // --- RUTA: REGISTER ---
        if (endpoint === 'register' && method === 'POST') {
            const { nombre, legajo, password } = JSON.parse(event.body);
            // Verificar duplicados
            const existing = await sql`SELECT legajo FROM afiliados WHERE legajo = ${legajo} LIMIT 1`;
            if (existing.length > 0) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'Ya existe una cuenta con este legajo' }) };
            }
            // Insertar usuario
            await sql`INSERT INTO afiliados (nombre, legajo, password) VALUES (${nombre}, ${legajo}, ${password})`;
            return { statusCode: 200, headers, body: JSON.stringify({ success: true, nombre, legajo }) };
        }

        // --- RUTA: POSTS (GET) ---
        if (endpoint === 'posts' && method === 'GET') {
            const posts = await sql`SELECT * FROM publicaciones ORDER BY last_activity DESC`;
            return { statusCode: 200, headers, body: JSON.stringify(posts) };
        }

        // --- RUTA: POSTS (POST - Crear Publicación) ---
        if (endpoint === 'posts' && method === 'POST') {
            const { nombre, legajo, mensaje, imagen_url } = JSON.parse(event.body);
            await sql`INSERT INTO publicaciones (nombre, legajo, mensaje, imagen_url) VALUES (${nombre}, ${legajo}, ${mensaje}, ${imagen_url})`;
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        // --- RUTA: COMMENTS (GET) ---
        if (endpoint === 'comments' && method === 'GET') {
            const comments = await sql`SELECT * FROM comentarios ORDER BY created_at ASC`;
            return { statusCode: 200, headers, body: JSON.stringify(comments) };
        }

        // --- RUTA: COMMENTS (POST - Crear Comentario) ---
        if (endpoint === 'comments' && method === 'POST') {
            const { post_id, nombre, legajo, mensaje } = JSON.parse(event.body);
            // Insertar comentario
            await sql`INSERT INTO comentarios (post_id, nombre, legajo, mensaje) VALUES (${post_id}, ${nombre}, ${legajo}, ${mensaje})`;
            // Actualizar last_activity en el post correspondiente
            await sql`UPDATE publicaciones SET last_activity = NOW() WHERE id = ${post_id}`;
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        // --- RUTA: REACCIÓN (POST) ---
        if (endpoint === 'react' && method === 'POST') {
            const { id, campo, valor } = JSON.parse(event.body);
            if (campo === 'likes') {
                await sql`UPDATE publicaciones SET likes = ${valor} WHERE id = ${id}`;
            } else if (campo === 'encantos') {
                await sql`UPDATE publicaciones SET encantos = ${valor} WHERE id = ${id}`;
            }
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        // --- RUTA: POSTS (DELETE - Borrar Publicación) ---
        if (endpoint === 'posts' && method === 'DELETE') {
            const id = event.queryStringParameters.id;
            await sql`DELETE FROM publicaciones WHERE id = ${id}`;
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Endpoint no encontrado' }) };

    } catch (error) {
        console.error('API Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || 'Error interno del servidor' })
        };
    }
};
