/**
 * Script de pruebas automatizadas para el sistema de reservas
 * 
 * Este script prueba diferentes escenarios para asegurar que el sistema
 * de reservas funcione correctamente en todos los casos.
 */

const axios = require('axios');

// Configuración
const API_URL = 'http://localhost:1337'; // Cambia esto según tu entorno
const AUTH_TOKEN = 'e862669b5e390731f7a5d5d3090dd6cd87f1569d531a66dd72952d9b50e73541e828cc1c8ed84cb1dc41dcc04909dadd766b96f820bd303ab9cf6b2d54e03b2a0524c4d7eff9b2cb0a7179646ea01a47cb02aca6e8e8fe4a8c02e5c6318190531b5db161f8a2fef8edcd697afa3b9c1c1399c6eed91427f4ceff6d4f169b7d65'; // Reemplaza con un token válido

// Configuración de axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`
  }
});

// Función para esperar un tiempo determinado
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Función para crear un usuario de prueba
async function crearUsuarioPrueba() {
  try {
    console.log('Intentando crear usuario de prueba...');
    
    // Datos del usuario con campos obligatorios
    const timestamp = Date.now();
    const userData = {
      username: `test_user_${timestamp}`,
      email: `test_${timestamp}@example.com`,
      password: 'Password123!',
      nombre: 'Usuario',
      apellido: 'De Prueba',
      birthday: '1990-01-01',
      telefono: '+52 1234 5678 90' // Formato correcto según la validación
    };
    
    console.log('Datos del usuario a crear:', JSON.stringify(userData, null, 2));
    
    // Usar el endpoint de registro de Strapi
    console.log('Enviando solicitud a /api/auth/local/register...');
    const response = await api.post('/api/auth/local/register', userData);
    
    console.log('Usuario creado exitosamente');
    console.log('ID:', response.data.user.id);
    console.log('Username:', response.data.user.username);
    console.log('JWT recibido:', response.data.jwt ? 'Sí (token válido)' : 'No');
    
    // Actualizar el token de autenticación
    api.defaults.headers.Authorization = `Bearer ${response.data.jwt}`;
    
    // Actualizar directamente el campo clases_disponibles del usuario
    try {
      console.log('Actualizando clases_disponibles del usuario...');
      await api.put(`/api/users/${response.data.user.id}`, {
        clases_disponibles: 0 // Inicializar en 0
      });
      console.log('Campo clases_disponibles actualizado correctamente');
    } catch (updateError) {
      console.error('Error al actualizar clases_disponibles:', updateError.response?.data || updateError.message);
    }
    
    return response.data.user;
  } catch (error) {
    console.error('Error al crear usuario de prueba:');
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

// Función para crear un paquete de clases
async function crearPaquete(userId, clasesOriginales, fechaExpiracion) {
  try {
    console.log(`Creando paquete para usuario ${userId}: ${clasesOriginales} clases, expira: ${fechaExpiracion}`);
    
    // Asegurarse de que la fecha de expiración sea futura
    const ahora = new Date();
    if (new Date(fechaExpiracion) <= ahora) {
      console.warn('⚠️ La fecha de expiración es pasada o actual. Ajustando a 30 días en el futuro.');
      const nuevaFechaExpiracion = new Date();
      nuevaFechaExpiracion.setDate(nuevaFechaExpiracion.getDate() + 30);
      fechaExpiracion = nuevaFechaExpiracion.toISOString();
      console.log(`Nueva fecha de expiración: ${fechaExpiracion}`);
    }
    
    // Datos del paquete a crear
    const paqueteData = {
      data: {
        clases_originales: clasesOriginales,
        clases_utilizadas: 0,
        clases_disponibles: clasesOriginales,
        fecha_expiracion: fechaExpiracion,
        user: {
          connect: [{ id: userId }]
        }
      }
    };
    
    console.log('Datos del paquete a crear:', JSON.stringify(paqueteData, null, 2));
    
    const response = await api.post('/api/purchased-ride-packs', {
      data: {
        clases_originales: clasesOriginales,
        clases_utilizadas: 0,
        clases_disponibles: clasesOriginales,
        fecha_expiracion: fechaExpiracion,
        user: {
          connect: [{ id: userId }]
        }
      }
    });
    
    console.log('Paquete creado exitosamente:', response.data.data.id);
    
    // Obtener el usuario actual para conocer sus clases disponibles
    const userResponse = await api.get(`/api/users/${userId}`);
    const clasesDisponiblesActuales = userResponse.data.clases_disponibles || 0;
    
    // Actualizar las clases disponibles del usuario sumando las nuevas
    console.log(`Actualizando clases_disponibles del usuario: ${clasesDisponiblesActuales} + ${clasesOriginales}`);
    await api.put(`/api/users/${userId}`, {
      clases_disponibles: clasesDisponiblesActuales + clasesOriginales
    });
    
    console.log(`Usuario actualizado con ${clasesDisponiblesActuales + clasesOriginales} clases disponibles`);
    
    // Verificar que el paquete se haya creado correctamente
    console.log('Verificando paquete creado...');
    const paqueteCreado = response.data.data;
    console.log('ID:', paqueteCreado.id);
    console.log('Clases originales:', paqueteCreado.attributes?.clases_originales);
    console.log('Clases utilizadas:', paqueteCreado.attributes?.clases_utilizadas);
    console.log('Clases disponibles:', paqueteCreado.attributes?.clases_disponibles);
    console.log('Fecha expiración:', paqueteCreado.attributes?.fecha_expiracion);
    
    return response.data.data;
  } catch (error) {
    console.error('Error al crear paquete:', error.response?.data || error.message);
    throw error;
  }
}

// Función para reservar una clase
async function reservarClase(userId, bicycles, fechaHora, classId) {
  try {
    console.log(`Intentando reservar: Usuario ${userId}, Clase ${classId}, Bicicletas: ${bicycles.join(', ')}`);
    
    // Verificar el estado del usuario antes de la reserva
    console.log('Verificando estado del usuario antes de la reserva...');
    const userResponse = await api.get(`/api/users/${userId}`);
    console.log('Clases disponibles del usuario:', userResponse.data.clases_disponibles);
    
    // Verificar paquetes disponibles
    console.log('Verificando paquetes disponibles...');
    const paquetesResponse = await api.get(`/api/purchased-ride-packs?filters[user][id][$eq]=${userId}`);
    const paquetes = paquetesResponse.data.data || [];
    
    console.log(`Encontrados ${paquetes.length} paquetes para el usuario:`);
    paquetes.forEach((paquete, index) => {
      console.log(`Paquete ${index + 1}:`);
      console.log('  ID:', paquete.id);
      console.log('  Clases originales:', paquete.attributes?.clases_originales);
      console.log('  Clases utilizadas:', paquete.attributes?.clases_utilizadas);
      console.log('  Clases disponibles:', paquete.attributes?.clases_disponibles);
      console.log('  Fecha expiración:', paquete.attributes?.fecha_expiracion);
      
      // Verificar si el paquete está expirado
      const fechaExpiracion = new Date(paquete.attributes?.fecha_expiracion);
      const ahora = new Date();
      console.log('  ¿Expirado?:', fechaExpiracion <= ahora ? 'Sí' : 'No');
    });
    
    // Corregir la URL para que coincida con la ruta definida en el archivo de rutas
    const response = await api.post('/api/bookings/reserve-and-update', {
      data: {
        userId,
        bicycles,
        fechaHora,
        classId
      }
    });
    
    console.log('Reserva exitosa:', response.data.booking?.id || 'ID no disponible');
    return response.data;
  } catch (error) {
    console.log('Error al reservar clase (esperado en algunos casos de prueba):', 
      error.response?.data?.error?.message || error.message);
    
    // Mostrar detalles adicionales del error
    if (error.response?.data?.error?.details) {
      console.log('Detalles del error:', JSON.stringify(error.response.data.error.details, null, 2));
    }
    
    return { error: error.response?.data || error.message };
  }
}

// Función para cancelar una reserva
async function cancelarReserva(bookingId) {
  try {
    const response = await api.delete(`/api/booking/${bookingId}/cancelAndRefundCredits`);
    return response.data;
  } catch (error) {
    console.error('Error al cancelar reserva:', error.response?.data || error.message);
    return { error: error.response?.data || error.message };
  }
}

// Función para obtener una clase disponible
async function obtenerClaseDisponible() {
  try {
    console.log('Buscando clases disponibles...');
    
    const response = await api.get('/api/classes', {
      params: {
        'pagination[limit]': 10,
        'sort': 'id:desc'
      }
    });
    
    if (response.data.data && response.data.data.length > 0) {
      const clase = response.data.data[0];
      console.log(`Clase encontrada: ID ${clase.id}, Nombre: ${clase.attributes?.nombreClase || 'Sin nombre'}`);
      return clase;
    }
    
    throw new Error('No hay clases disponibles');
  } catch (error) {
    console.error('Error al obtener clase:', error.response?.data || error.message);
    throw error;
  }
}

// Función para obtener bicicletas disponibles
async function obtenerBicicletasDisponibles(cantidad = 1) {
  try {
    console.log(`Buscando ${cantidad} bicicletas disponibles...`);
    
    const response = await api.get('/api/bicycles', {
      params: {
        'pagination[limit]': Math.max(cantidad * 2, 10),
        'sort': 'id:asc'
      }
    });
    
    if (response.data.data && response.data.data.length >= cantidad) {
      const bicicletas = response.data.data.slice(0, cantidad).map(b => b.id);
      console.log(`Bicicletas encontradas: ${bicicletas.join(', ')}`);
      return bicicletas;
    }
    
    throw new Error(`No hay suficientes bicicletas disponibles (se necesitan ${cantidad})`);
  } catch (error) {
    console.error('Error al obtener bicicletas:', error.response?.data || error.message);
    throw error;
  }
}

// Casos de prueba
async function ejecutarPruebas() {
  console.log('Iniciando pruebas automatizadas del sistema de reservas...');
  console.log('API URL:', API_URL);
  
  try {
    // Crear usuario de prueba
    console.log('\n=== Preparando entorno de pruebas ===');
    const usuario = await crearUsuarioPrueba();
    const userId = usuario.id;
    console.log(`Usuario de prueba creado con ID: ${userId}`);
    
    // Obtener una clase para las pruebas
    const clase = await obtenerClaseDisponible();
    const classId = clase.id;
    console.log(`Clase de prueba obtenida con ID: ${classId}`);
    
    // Obtener bicicletas para las pruebas
    const bicicletas = await obtenerBicicletasDisponibles(3);
    console.log(`Bicicletas de prueba obtenidas: ${bicicletas.join(', ')}`);
    
    // Fecha para las pruebas (mañana a las 10:00)
    const fechaManana = new Date();
    fechaManana.setDate(fechaManana.getDate() + 1);
    fechaManana.setHours(10, 0, 0, 0);
    const fechaHora = fechaManana.toISOString();
    console.log(`Fecha/hora para pruebas: ${fechaHora}`);
    
    console.log('\n=== Iniciando casos de prueba ===');
    
    // CASO 1: Intentar reservar sin créditos
    console.log('\n--- CASO 1: Intentar reservar sin créditos ---');
    const resultado1 = await reservarClase(userId, [bicicletas[0]], fechaHora, classId);
    if (resultado1.error) {
      console.log('✅ ÉXITO: No se permitió reservar sin créditos');
    } else {
      console.log('❌ FALLO: Se permitió reservar sin créditos');
    }
    
    // CASO 2: Reservar con créditos suficientes
    console.log('\n--- CASO 2: Reservar con créditos suficientes ---');
    // Crear paquete con 5 clases que expira en 30 días
    const fechaExpiracion = new Date();
    fechaExpiracion.setDate(fechaExpiracion.getDate() + 30);
    await crearPaquete(userId, 5, fechaExpiracion.toISOString());
    console.log('Paquete de 5 clases creado');
    
    const resultado2 = await reservarClase(userId, [bicicletas[0]], fechaHora, classId);
    if (!resultado2.error) {
      console.log('✅ ÉXITO: Reserva realizada correctamente');
      console.log(`Booking ID: ${resultado2.booking?.id || 'No disponible'}`);
    } else {
      console.log('❌ FALLO: No se pudo realizar la reserva con créditos suficientes');
      console.log('Error:', JSON.stringify(resultado2.error, null, 2));
    }
    
    console.log('\nPruebas básicas completadas. Ejecuta el script completo cuando estos casos funcionen correctamente.');
    
  } catch (error) {
    console.error('Error durante las pruebas:', error);
  }
}

// Ejecutar las pruebas
ejecutarPruebas().then(() => {
  console.log('Script de pruebas finalizado.');
}).catch(error => {
  console.error('Error fatal en el script de pruebas:', error);
}); 