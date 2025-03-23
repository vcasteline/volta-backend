/**
 * Script de pruebas de estrés para el sistema de reservas
 * 
 * Este script simula múltiples reservas simultáneas para probar
 * la robustez del sistema bajo carga.
 */

const axios = require('axios');

// Configuración
const API_URL = 'http://localhost:1337'; // Cambia esto según tu entorno
const AUTH_TOKEN = 'e862669b5e390731f7a5d5d3090dd6cd87f1569d531a66dd72952d9b50e73541e828cc1c8ed84cb1dc41dcc04909dadd766b96f820bd303ab9cf6b2d54e03b2a0524c4d7eff9b2cb0a7179646ea01a47cb02aca6e8e8fe4a8c02e5c6318190531b5db161f8a2fef8edcd697afa3b9c1c1399c6eed91427f4ceff6d4f169b7d65'; // Reemplaza con un token válido
const NUM_USUARIOS = 10; // Número de usuarios para las pruebas
const NUM_RESERVAS_POR_USUARIO = 3; // Número de intentos de reserva por usuario
const CONCURRENCIA = 5; // Número de reservas concurrentes

// Configuración de axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`
  }
});

// Función para esperar un tiempo aleatorio
const sleepRandom = async (min = 100, max = 500) => {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Función para crear un usuario de prueba con créditos
async function crearUsuarioConCreditos() {
  try {
    console.log('Intentando crear usuario de prueba con créditos...');
    
    // Datos del usuario con campos obligatorios
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const userData = {
      username: `stress_user_${timestamp}_${random}`,
      email: `stress_${timestamp}_${random}@example.com`,
      password: 'Password123!',
      nombre: 'Usuario',
      apellido: 'De Prueba',
      birthday: '1990-01-01',
      telefono: '+52 1234 5678 90' // Formato correcto según la validación
    };
    
    console.log('Datos del usuario a crear:', JSON.stringify(userData, null, 2));
    
    // Crear usuario usando el endpoint de registro de Strapi
    console.log('Enviando solicitud a /api/auth/local/register...');
    const userResponse = await api.post('/api/auth/local/register', userData);
    
    const userId = userResponse.data.user.id;
    const userJwt = userResponse.data.jwt;
    
    console.log('Usuario creado exitosamente:');
    console.log('ID:', userId);
    console.log('Username:', userResponse.data.user.username);
    console.log('JWT recibido:', userJwt ? 'Sí (token válido)' : 'No');
    
    // Actualizar el token de autenticación
    api.defaults.headers.Authorization = `Bearer ${userJwt}`;
    
    // Inicializar clases_disponibles en 0
    console.log('Inicializando clases_disponibles del usuario...');
    await api.put(`/api/users/${userId}`, {
      clases_disponibles: 0
    });
    
    // Crear paquete de clases
    console.log('Creando paquete de clases para el usuario...');
    const fechaExpiracion = new Date();
    fechaExpiracion.setDate(fechaExpiracion.getDate() + 30);
    
    const clasesOriginales = 10;
    
    const paqueteData = {
      data: {
        clases_originales: clasesOriginales,
        clases_utilizadas: 0,
        clases_disponibles: clasesOriginales,
        fecha_expiracion: fechaExpiracion.toISOString(),
        user: {
          connect: [{ id: userId }]
        }
      }
    };
    
    console.log('Datos del paquete a crear:', JSON.stringify(paqueteData, null, 2));
    
    const paqueteResponse = await api.post('/api/purchased-ride-packs', paqueteData);
    console.log('Paquete de 10 clases creado para usuario', userId);
    console.log('ID del paquete:', paqueteResponse.data.data?.id || 'No disponible');
    
    // Actualizar las clases disponibles del usuario
    console.log(`Actualizando clases_disponibles del usuario a ${clasesOriginales}`);
    await api.put(`/api/users/${userId}`, {
      clases_disponibles: clasesOriginales
    });
    
    console.log(`Usuario actualizado con ${clasesOriginales} clases disponibles`);
    
    return {
      id: userId,
      username: userData.username,
      jwt: userJwt
    };
  } catch (error) {
    console.error('Error al crear usuario con créditos:');
    if (error.response) {
      console.error('Código de estado:', error.response.status);
      console.error('Datos de respuesta:', JSON.stringify(error.response.data, null, 2));
      
      // Mostrar detalles específicos de validación si están disponibles
      if (error.response.data?.error?.details?.errors) {
        console.error('Errores de validación:');
        error.response.data.error.details.errors.forEach((err, index) => {
          console.error(`  ${index + 1}. Campo: ${err.path}, Mensaje: ${err.message}`);
        });
      }
    } else {
      console.error('Error completo:', error.message);
    }
    throw error;
  }
}

// Función para obtener clases disponibles
async function obtenerClasesDisponibles(limit = 5) {
  try {
    const response = await api.get('/api/classes', {
      params: {
        'pagination[limit]': limit
      }
    });
    
    if (response.data.data && response.data.data.length > 0) {
      return response.data.data;
    }
    throw new Error('No hay clases disponibles');
  } catch (error) {
    console.error('Error al obtener clases:', error.response?.data || error.message);
    throw error;
  }
}

// Función para obtener bicicletas disponibles
async function obtenerBicicletasDisponibles(limit = 30) {
  try {
    const response = await api.get('/api/bicycles', {
      params: {
        'pagination[limit]': limit
      }
    });
    
    if (response.data.data && response.data.data.length > 0) {
      return response.data.data.map(b => b.id);
    }
    throw new Error('No hay bicicletas disponibles');
  } catch (error) {
    console.error('Error al obtener bicicletas:', error.response?.data || error.message);
    throw error;
  }
}

// Función para intentar una reserva
async function intentarReserva(userId, bicycleId, fechaHora, classId) {
  try {
    console.log(`Intentando reservar: Usuario ${userId}, Clase ${classId}, Bicicleta ${bicycleId}`);
    
    // Corregir la URL para que coincida con la ruta definida en el archivo de rutas
    const response = await api.post('/api/bookings/reserve-and-update', {
      data: {
        userId,
        bicycles: [bicycleId],
        fechaHora,
        classId
      }
    });
    
    console.log('Reserva exitosa:', response.data.booking?.id || 'ID no disponible');
    return response.data;
  } catch (error) {
    console.log('Error al reservar clase:', 
      error.response?.data?.error?.message || error.message);
    return { error: error.response?.data || error.message };
  }
}

// Función para ejecutar pruebas de estrés
async function ejecutarPruebasEstres() {
  console.log('Iniciando pruebas de estrés del sistema de reservas...');
  console.log(`Configuración: ${NUM_USUARIOS} usuarios, ${NUM_RESERVAS_POR_USUARIO} reservas por usuario, ${CONCURRENCIA} concurrentes`);
  
  try {
    // 1. Crear usuarios de prueba
    console.log('Creando usuarios de prueba...');
    const usuarios = [];
    for (let i = 0; i < NUM_USUARIOS; i++) {
      const usuario = await crearUsuarioConCreditos();
      usuarios.push(usuario);
      console.log(`Usuario ${i+1}/${NUM_USUARIOS} creado: ${usuario.username}`);
      await sleepRandom(100, 300);
    }
    
    // 2. Obtener clases y bicicletas
    console.log('Obteniendo clases y bicicletas...');
    const clases = await obtenerClasesDisponibles();
    const bicicletas = await obtenerBicicletasDisponibles();
    
    console.log(`Obtenidas ${clases.length} clases y ${bicicletas.length} bicicletas`);
    
    // 3. Preparar fechas para las reservas (próximos 7 días)
    const fechas = [];
    for (let i = 1; i <= 7; i++) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + i);
      fecha.setHours(10 + (i % 8), 0, 0, 0); // Horas entre 10:00 y 17:00
      fechas.push(fecha.toISOString());
    }
    
    // 4. Preparar todas las tareas de reserva
    const tareas = [];
    for (let u = 0; u < usuarios.length; u++) {
      for (let r = 0; r < NUM_RESERVAS_POR_USUARIO; r++) {
        // Seleccionar clase, bicicleta y fecha aleatoriamente
        const claseIndex = Math.floor(Math.random() * clases.length);
        const bicicletaIndex = Math.floor(Math.random() * bicicletas.length);
        const fechaIndex = Math.floor(Math.random() * fechas.length);
        
        tareas.push({
          userId: usuarios[u].id,
          username: usuarios[u].username,
          bicycleId: bicicletas[bicicletaIndex],
          fechaHora: fechas[fechaIndex],
          classId: clases[claseIndex].id,
          className: clases[claseIndex].attributes?.nombreClase || 'Clase sin nombre'
        });
      }
    }
    
    // 5. Ejecutar reservas con concurrencia limitada
    console.log(`Ejecutando ${tareas.length} intentos de reserva con concurrencia ${CONCURRENCIA}...`);
    
    const resultados = {
      total: tareas.length,
      exitosas: 0,
      fallidas: 0,
      tiempoPromedio: 0,
      errores: {}
    };
    
    // Función para procesar un lote de tareas
    async function procesarLote(lote) {
      return Promise.all(lote.map(async (tarea) => {
        await sleepRandom(50, 200); // Pequeña variación en el tiempo de inicio
        
        console.log(`Intentando reserva: Usuario ${tarea.username}, Clase ${tarea.className}, Bici ${tarea.bicycleId}`);
        const resultado = await intentarReserva(
          tarea.userId, 
          tarea.bicycleId, 
          tarea.fechaHora, 
          tarea.classId
        );
        
        if (resultado.success) {
          resultados.exitosas++;
          resultados.tiempoPromedio += resultado.tiempo;
          console.log(`✅ Reserva exitosa: ${tarea.username}, Booking ID: ${resultado.bookingId}, Tiempo: ${resultado.tiempo}ms`);
        } else {
          resultados.fallidas++;
          const errorKey = resultado.error || 'Error desconocido';
          resultados.errores[errorKey] = (resultados.errores[errorKey] || 0) + 1;
          console.log(`❌ Reserva fallida: ${tarea.username}, Error: ${resultado.error}`);
        }
        
        return resultado;
      }));
    }
    
    // Procesar tareas en lotes según la concurrencia
    for (let i = 0; i < tareas.length; i += CONCURRENCIA) {
      const lote = tareas.slice(i, i + CONCURRENCIA);
      await procesarLote(lote);
    }
    
    // Calcular tiempo promedio
    if (resultados.exitosas > 0) {
      resultados.tiempoPromedio = Math.round(resultados.tiempoPromedio / resultados.exitosas);
    }
    
    // 6. Mostrar resultados
    console.log('\n--- RESULTADOS DE LAS PRUEBAS DE ESTRÉS ---');
    console.log(`Total de intentos: ${resultados.total}`);
    console.log(`Reservas exitosas: ${resultados.exitosas} (${Math.round(resultados.exitosas / resultados.total * 100)}%)`);
    console.log(`Reservas fallidas: ${resultados.fallidas} (${Math.round(resultados.fallidas / resultados.total * 100)}%)`);
    
    if (resultados.exitosas > 0) {
      console.log(`Tiempo promedio de respuesta: ${resultados.tiempoPromedio}ms`);
    }
    
    if (resultados.fallidas > 0) {
      console.log('\nDistribución de errores:');
      for (const [error, cantidad] of Object.entries(resultados.errores)) {
        console.log(`- ${error}: ${cantidad} (${Math.round(cantidad / resultados.fallidas * 100)}%)`);
      }
    }
    
    console.log('\nPruebas de estrés completadas.');
    
  } catch (error) {
    console.error('Error durante las pruebas de estrés:', error);
  }
}

// Ejecutar las pruebas
ejecutarPruebasEstres().then(() => {
  console.log('Script de pruebas de estrés finalizado.');
}).catch(error => {
  console.error('Error fatal en el script de pruebas de estrés:', error);
}); 