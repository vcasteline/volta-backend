# Guía de Pruebas Manuales para el Sistema de Reservas

Esta guía proporciona instrucciones paso a paso para probar manualmente diferentes escenarios en el sistema de reservas de Volta.

## Requisitos Previos

- Acceso a la aplicación móvil y/o web
- Credenciales de usuario con diferentes niveles de acceso
- Varios paquetes de clases (algunos activos, algunos expirados)

## Preparación del Entorno de Pruebas

### Crear Usuarios de Prueba

1. Accede al panel de administración de Strapi
2. Crea varios usuarios con diferentes configuraciones:
   - Usuario A: Sin créditos
   - Usuario B: Con 5 créditos activos
   - Usuario C: Con créditos expirados
   - Usuario D: Con múltiples paquetes (algunos activos, algunos expirados)

### Crear Paquetes de Clases

Para cada usuario de prueba, crea los paquetes necesarios:
1. Accede a "Purchased Ride Packs" en el panel de administración
2. Crea paquetes con diferentes configuraciones:
   - Paquete activo: fecha de expiración futura
   - Paquete expirado: fecha de expiración pasada
   - Paquete con pocos créditos: 1-2 clases disponibles
   - Paquete con muchos créditos: 10+ clases disponibles

### Verificar Clases y Bicicletas

Asegúrate de que existan:
1. Varias clases programadas para los próximos días
2. Suficientes bicicletas asignadas a cada clase

## Escenarios de Prueba

### 1. Reserva Básica

**Objetivo**: Verificar que un usuario puede reservar una clase con créditos disponibles.

**Pasos**:
1. Iniciar sesión con un usuario que tenga créditos disponibles
2. Navegar a la pantalla de horarios
3. Seleccionar una fecha y clase disponible
4. Seleccionar una bicicleta disponible
5. Confirmar la reserva

**Resultado esperado**: La reserva se completa con éxito y se muestra en "Mis Clases".

### 2. Reserva sin Créditos Suficientes

**Objetivo**: Verificar que el sistema impide reservas cuando no hay créditos suficientes.

**Pasos**:
1. Iniciar sesión con un usuario que tenga 0 créditos disponibles
2. Intentar realizar una reserva siguiendo los pasos anteriores

**Resultado esperado**: El sistema muestra un mensaje de error indicando que no hay créditos suficientes y ofrece la opción de comprar un paquete.

### 3. Reserva con Paquete Expirado

**Objetivo**: Verificar que el sistema no utiliza créditos de paquetes expirados.

**Pasos**:
1. Preparar un usuario que solo tenga un paquete expirado (con créditos)
2. Intentar realizar una reserva

**Resultado esperado**: El sistema muestra un mensaje de error indicando que no hay créditos disponibles, ignorando los créditos expirados.

### 4. Reserva con Múltiples Paquetes

**Objetivo**: Verificar que el sistema utiliza primero los créditos del paquete que expira antes.

**Pasos**:
1. Preparar un usuario con dos paquetes activos:
   - Paquete A: 2 créditos, expira en 5 días
   - Paquete B: 5 créditos, expira en 30 días
2. Realizar una reserva de 1 bicicleta

**Resultado esperado**: El sistema utiliza 1 crédito del Paquete A (el que expira antes).

### 5. Reserva de Múltiples Bicicletas

**Objetivo**: Verificar que el sistema permite reservar múltiples bicicletas y descuenta los créditos correctamente.

**Pasos**:
1. Iniciar sesión con un usuario que tenga al menos 3 créditos disponibles
2. Realizar una reserva seleccionando 3 bicicletas

**Resultado esperado**: La reserva se completa con éxito y se descuentan 3 créditos.

### 6. Intento de Reserva Duplicada

**Objetivo**: Verificar que un usuario no puede reservar dos veces la misma clase.

**Pasos**:
1. Realizar una reserva exitosa
2. Intentar reservar otra bicicleta para la misma clase

**Resultado esperado**: El sistema muestra un mensaje indicando que ya existe una reserva para esa clase.

### 7. Intento de Reserva de Bicicleta Ocupada

**Objetivo**: Verificar que no se puede reservar una bicicleta ya reservada.

**Pasos**:
1. Con el Usuario A, reservar la bicicleta X para una clase específica
2. Con el Usuario B, intentar reservar la misma bicicleta X para la misma clase

**Resultado esperado**: El sistema muestra un mensaje indicando que la bicicleta ya está reservada.

### 8. Cancelación de Reserva

**Objetivo**: Verificar que la cancelación de una reserva devuelve los créditos correctamente.

**Pasos**:
1. Realizar una reserva exitosa
2. Navegar a "Mis Clases"
3. Cancelar la reserva

**Resultado esperado**: La reserva se cancela y los créditos se devuelven al paquete correspondiente.

### 9. Cancelación de Reserva Múltiple

**Objetivo**: Verificar que la cancelación de una reserva múltiple devuelve todos los créditos.

**Pasos**:
1. Realizar una reserva de 3 bicicletas
2. Cancelar la reserva

**Resultado esperado**: Se devuelven los 3 créditos al usuario.

### 10. Visualización de Spots Disponibles

**Objetivo**: Verificar que el sistema muestra correctamente los spots disponibles.

**Pasos**:
1. Observar el número de spots disponibles para una clase
2. Realizar una reserva para esa clase
3. Verificar que el número de spots disponibles ha disminuido
4. Cancelar la reserva
5. Verificar que el número de spots disponibles ha aumentado

**Resultado esperado**: El contador de spots disponibles se actualiza correctamente después de cada acción.

### 11. Prueba de Concurrencia

**Objetivo**: Verificar que el sistema maneja correctamente reservas simultáneas.

**Pasos**:
1. Preparar dos dispositivos con sesiones de diferentes usuarios
2. Intentar reservar la misma bicicleta simultáneamente desde ambos dispositivos

**Resultado esperado**: Solo uno de los usuarios debería poder completar la reserva, mientras que el otro debería recibir un mensaje de error.

### 12. Prueba de Rollback en Caso de Error

**Objetivo**: Verificar que el sistema realiza rollback correctamente si ocurre un error durante la reserva.

**Pasos**:
1. (Esta prueba requiere acceso al código o la base de datos)
2. Introducir un error temporal en el proceso de reserva (por ejemplo, desconectar la base de datos durante la transacción)
3. Intentar realizar una reserva

**Resultado esperado**: La reserva falla, no se descuentan créditos y no se crea ningún registro parcial en la base de datos.

## Registro de Resultados

Para cada prueba, registra:
- Fecha y hora de la prueba
- Usuario utilizado
- Resultado (Éxito/Fallo)
- Capturas de pantalla de cualquier error
- Notas adicionales

## Problemas Conocidos

- [Lista de problemas conocidos, si los hay]

## Sugerencias para Mejoras

- [Espacio para anotar sugerencias de mejora basadas en las pruebas] 