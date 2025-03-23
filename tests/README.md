# Pruebas del Sistema de Reservas de Volta

Este directorio contiene herramientas para probar el sistema de reservas de Volta, incluyendo pruebas automatizadas, pruebas de estrés y una guía para pruebas manuales.

## Requisitos

Antes de ejecutar las pruebas, asegúrate de tener instalado:

- Node.js (v14 o superior)
- npm o yarn
- Acceso al backend de Volta (en ejecución)

## Instalación

Instala las dependencias necesarias:

```bash
cd volta-backend
npm install axios
```

## Configuración

Antes de ejecutar las pruebas, debes configurar los siguientes parámetros en cada archivo de prueba:

1. En `booking-tests.js` y `booking-stress-test.js`:
   - `API_URL`: URL del backend de Volta (por defecto: 'http://localhost:1337')
   - `AUTH_TOKEN`: Token de autenticación válido con permisos de administrador

## Ejecución de Pruebas

### Pruebas Automatizadas

Estas pruebas verifican diferentes escenarios de reserva:

```bash
node tests/booking-tests.js
```

### Pruebas de Estrés

Estas pruebas simulan múltiples reservas simultáneas para evaluar la robustez del sistema:

```bash
node tests/booking-stress-test.js
```

Puedes ajustar los parámetros de concurrencia en el archivo:
- `NUM_USUARIOS`: Número de usuarios para las pruebas
- `NUM_RESERVAS_POR_USUARIO`: Número de intentos de reserva por usuario
- `CONCURRENCIA`: Número de reservas concurrentes

### Pruebas Manuales

Consulta la guía `manual-test-guide.md` para instrucciones detalladas sobre cómo probar manualmente diferentes escenarios.

## Interpretación de Resultados

### Pruebas Automatizadas

El script mostrará el resultado de cada caso de prueba con un indicador de éxito (✅) o fallo (❌).

### Pruebas de Estrés

Al finalizar, el script mostrará:
- Total de intentos de reserva
- Número y porcentaje de reservas exitosas
- Número y porcentaje de reservas fallidas
- Tiempo promedio de respuesta
- Distribución de errores

## Solución de Problemas

Si encuentras errores al ejecutar las pruebas:

1. Verifica que el backend esté en ejecución y accesible
2. Asegúrate de que el token de autenticación sea válido
3. Comprueba que existan datos suficientes (clases, bicicletas) en el sistema
4. Revisa los logs del backend para identificar posibles errores

## Contribución

Si encuentras problemas o quieres mejorar estas pruebas, por favor:
1. Documenta el problema o mejora
2. Actualiza los scripts según sea necesario
3. Actualiza esta documentación 