# Correos de la cuenta (recuperar contraseña, bienvenida)

Estado del **código**: listo y funcionando.

- `/auth` → "Olvidé mi contraseña" llama a `resetPasswordForEmail` con
  `redirectTo = <origen>/reset-password`.
- `/reset-password` recibe el enlace, valida la sesión de recuperación y guarda la
  contraseña nueva. Si el enlace expiró, ofrece pedir uno nuevo.
- Los errores están traducidos a lenguaje de mamá (límite de envíos, fallo de
  envío, correo inexistente).

Lo único pendiente es **configuración**, no código: el remitente de correos.

---

## Por qué hay que configurarlo

Lovable Cloud (Supabase por debajo) trae un remitente compartido **solo para
pruebas**: envía muy pocos correos por hora y suele entregar únicamente a las
direcciones del equipo del proyecto. Con clientes reales, muchas mamás **no
recibirían** el correo de recuperación.

La solución es usar un remitente propio (SMTP) con **Resend**, que ya está
previsto en este kit (`env.example` incluye `RESEND_API_KEY` y `SEND_FROM_DOMAIN`).

---

## Pasos (una sola vez)

1. **Crear la cuenta en Resend** (resend.com) y verificar el dominio desde el que
   se enviarán los correos (por ejemplo `minichefs.app`). Resend indica los
   registros DNS (SPF/DKIM) que hay que agregar al dominio.
2. **Crear una API key** en Resend.
3. **Configurar el SMTP en el proyecto** (en Lovable: pídele que abra la
   configuración de Auth del backend / o en el panel de Supabase del proyecto,
   sección *Authentication → Emails → SMTP Settings*):
   - Host: `smtp.resend.com`
   - Puerto: `465` (SSL) o `587` (TLS)
   - Usuario: `resend`
   - Contraseña: la API key de Resend
   - Remitente: `MiniChefs <hola@tu-dominio>`
4. **Revisar las URLs permitidas** (*Authentication → URL Configuration*):
   - Site URL: `https://mini-chefs.lovable.app` (o el dominio propio)
   - Redirect URLs: agregar `https://mini-chefs.lovable.app/reset-password`
     (y el dominio propio si se usa otro).
     Sin esto, el enlace del correo no abrirá la pantalla correcta.
5. **Pegar las plantillas con la identidad MiniChefs** (*Authentication → Email
   Templates*). Están listas en `05-edge-functions/emails/`:
   - `password-reset.html` → plantilla "Reset Password"
   - `welcome.html` → plantilla "Confirm signup" (si algún día se abre registro)

---

## Cómo comprobar que quedó bien

1. En `/auth`, toca "Olvidé mi contraseña" y escribe un correo real que exista
   como usuario.
2. Debe llegar el correo con la identidad de MiniChefs (revisar también spam).
3. Al abrir el enlace debe cargar `/reset-password` y permitir guardar la nueva
   contraseña.
4. Iniciar sesión con la contraseña nueva.

---

## Mientras no esté configurado

El panel de administración (`/admin`) permite al admin **cambiar la contraseña de
cualquier usuario** en el momento: editar usuario → Credenciales → nueva
contraseña. Es el respaldo para atender a una clienta que no pueda entrar.
