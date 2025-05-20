    /* ------ auth básica ------- */
    const token    = localStorage.getItem('token') || sessionStorage.getItem('token');
    const role     = localStorage.getItem('role')  || sessionStorage.getItem('role');
    const username = localStorage.getItem('username') || sessionStorage.getItem('username');

    if (!token) location.href = 'index.html';

    console.log('🟢 urgentes.js cargado');
document.addEventListener('DOMContentLoaded', () => console.log('🟢 DOM listo'));


    document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear(); sessionStorage.clear(); location.href = 'index.html';
    });

    /* ------ elementos DOM ------- */
    const urgentesTbody = document.getElementById('urgentesTbody');
    const overlay       = document.getElementById('overlay');
    const modal         = document.getElementById('ticketModal');
    const closeModalBtn = document.getElementById('closeModalBtn');

    /* ------ socket para live update ------- */
    const socket = io();
    socket.on('nuevoTicket',   loadUrgentes);
    socket.on('ticketActualizado', loadUrgentes);
    socket.on('connect', () => console.log('[Urgentes] conectado a Socket.IO'));

    /* ------ carga inicial ------- */
    document.addEventListener('DOMContentLoaded', loadUrgentes);

    /* ------ fetch y render ------- */
    async function loadUrgentes() {
        console.log('🚀 loadUrgentes() llamado');
    try {
        const res = await fetch('/tickets/urgentes', { headers: { Authorization:`Bearer ${token}` }});
        const tickets = await res.json();
        renderUrgentes(tickets);
        console.log('⇄ respuesta', res.status);
    } catch (err) {
        console.error('Error al cargar urgentes:', err);
    }
    }

    function renderUrgentes(tickets) {
    urgentesTbody.innerHTML = '';
    const fragment = document.createDocumentFragment();

    const tipoClassMap = { consulta:'badge-consulta', revision:'badge-revision', pendiente:'badge-pendiente', urgente:'badge-urg' };

    tickets.forEach(tk => {
        const estadoClass =
        tk.estado === 'resuelto' ? 'estado-verde' :
        tk.estado === 'negativo' ? 'estado-rojo'  :
        tk.estado === 'anulado'  ? 'estado-anulado' : 'estado-naranja';

        const row = document.createElement('tr');
        row.dataset.id = tk._id;
        const fechaIngStr = tk.fechaIngreso
            ? new Date(tk.fechaIngreso).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit'
            })
         : (tk.plazoEntrega || '--');

        row.innerHTML = `
        <td class="center-col">${new Date(tk.fecha).toLocaleDateString('es-ES')}</td>
        <td class="center-col"><span class="badge ${tipoClassMap[tk.tipo] || ''}">${tk.tipo}</span></td>
        <td class="center-col" >${tk.usuario?.username || 'N/A'}</td>
        <td class="center-col">${tk.cliente}</td>
        <td class="center-col">${tk.cod_pos || 'N/A'}</td>
        <td class="center-col">${tk.cant || 'N/A'}</td>
        <td class="center-col">${fechaIngStr}</td>
        <td class="center-col">${tk.llego || 'no'}</td>
        `;

        row.addEventListener('click', () => openModal(tk));
        fragment.appendChild(row);
    });

    urgentesTbody.appendChild(fragment);
    }

    /* ------ modal ------- */
/* ---------- modal ---------- */
function openModal(tk) {
    // mostrar overlay + modal
    overlay.style.display = modal.style.display = 'block';
  
    /* ── encabezado ID / hora ── */
    document.getElementById('modalShortId').textContent =
      `ID: ${tk.shortId}`;
    document.getElementById('modalFecha').textContent =
      `H: ${new Date(tk.fecha).toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit'
        })}`;
  
    /* ── tabla principal ── */
    const body = document.getElementById('modalBody');
    body.innerHTML = `
      <tr><th>TIPO</th>       <td>${tk.tipo}</td></tr>
      <tr><th>CHASIS</th>     <td>${tk.chasis   || 'N/A'}</td></tr>
      <tr><th>COD/POS</th>    <td>${tk.cod_pos  || 'N/A'}</td></tr>
      <tr><th>CLIENTE</th>    <td>${tk.cliente  || 'N/A'}</td></tr>
      <tr><th>COMENTARIO</th> <td>${tk.comentario || 'N/A'}</td></tr>
      <tr><th>LLEGÓ</th>      <td>${tk.llego    || 'no'}</td></tr>
    `;
  
    /* ── ¿Hay resolución? ── */
    if (['resuelto', 'negativo', 'anulado'].includes(tk.estado)) {
      const estadoColor =
        tk.estado === 'resuelto' ? 'verde' :
        tk.estado === 'negativo' ? 'rojo' : 'gris';
  
      const fechaIng = tk.fechaIngreso
        ? new Date(tk.fechaIngreso).toLocaleDateString('es-ES')
        : (tk.plazoEntrega || '--');
  
      body.insertAdjacentHTML('beforeend', `
        <tr><td colspan="2" style="padding:0;"></td></tr> <!-- separador -->
        <tr><td colspan="2" class="resol-title">
              Resolución: <span class="circulo-detalle ${tk.estado}"></span>
            </td></tr>
        <tr><th>RESOLUCIÓN</th>      <td>${tk.resolucion        || '--'}</td></tr>
        <tr><th>COD/POS</th>         <td>${tk.codigo            || '--'}</td></tr>
        <tr><th>PROVEEDOR</th>       <td>${tk.proveedor          || '--'}</td></tr>
        <tr><th>INGRESO</th>         <td>${fechaIng}</td></tr>
        <tr><th>CANTIDAD RESUELTA</th><td>${tk.cantidad_resuelta || '--'}</td></tr>
        <tr><th>COMENTARIO</th>      <td>${tk.comentario_resolucion || '--'}</td></tr>
      `);
    }
  }
  
  /* cerrar */
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });
  closeModalBtn.addEventListener('click', closeModal);
  
  function closeModal() {
    overlay.style.display = modal.style.display = 'none';
  }
  
