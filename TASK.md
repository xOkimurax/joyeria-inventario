# Sistema de Inventario - Joyería

## Stack
- Frontend: React + Vite + TailwindCSS + pnpm
- Backend: Node.js + Express
- DB: PostgreSQL en InsForge (connection string provista)
- Storage imágenes: MinIO (a configurar más adelante, por ahora placeholder)
- PDF: jsPDF

## DB Connection
DATABASE_URL=postgresql://postgres:66aa0a20ccf71cbfb3f61bdee4ee5031@9bc8pwrr.us-east.database.insforge.app:5432/insforge?sslmode=require

## Módulos
1. Login / Registro / Recuperación contraseña
   - Username único (no email), + contraseña
   - Email solo para recuperación
   - Envío de código por correo (usar nodemailer + SMTP)
   
2. Dashboard
   - Métricas: stock total, ventas del día/mes, productos con stock bajo, valor del inventario
   - Filtros: por categoría, tipo, rango de precio, con/sin proveedor
   - Exportar reporte PDF
   
3. Inventario (productos)
   - Campos: nombre, descripción, categoría, tipo, precio_compra, precio_venta, stock, foto, proveedor (opcional)
   - CRUD completo
   - Filtros completos
   
4. Ventas
   - Registrar venta, historial, totales
   
5. Proveedores
   - Lista, agregar/editar, ver productos por proveedor
   
6. Categorías
   - Gestión simple
   
7. Configuración
   - Cambiar contraseña
   - Cambiar email de recuperación

## Auth
- Username único + contraseña (bcrypt)
- Email solo para recuperación de contraseña
- JWT para sesiones

## Diseño
- Lo más atractivo visualmente posible
- Responsive (mobile + desktop)
- Tema elegante acorde a joyería (colores oscuros/dorados o clean/premium)

## Estructura del proyecto
- /backend - Express API
- /frontend - React + Vite

## Notas
- El proyecto debe tener Dockerfile listo para deployar en Dokploy
- Usar esquema de DB con migraciones (crear tablas automáticamente al iniciar)
