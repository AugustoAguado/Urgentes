let token = localStorage.getItem('token') || sessionStorage.getItem('token');
let role = localStorage.getItem('role') || sessionStorage.getItem('role');
let username = localStorage.getItem('username') || sessionStorage.getItem('username');
if (!token || role !== 'compras') {
  window.location.href = 'index.html';
}

let isEditing = false;
let pendingRefresh = false;
let openTicketId = null;

const socket = io();
socket.on('connect', () => {
  console.log('Conectado a Socket.IO como compras');
});

socket.on('nuevoTicket', () => {
  handleSocketEvent();
});

socket.on('ticketActualizado', () => {
  console.log('[Compras] - Modal abierto, posponiendo refresco...');
  handleSocketEvent();
});

socket.on('nuevoComentario', ({ ticketId, comentario }) => {
  if (openTicketId === ticketId) {
    const commentsList = document.getElementById('commentsList');
    const existingComment = Array.from(commentsList.children).some(
      (commentItem) => commentItem.dataset.commentId === comentario._id
    );

    if (!existingComment) {
      addCommentToList(commentsList, comentario);
    }
  } else {
    console.log(`[Socket.IO] - Comentario recibido para otro ticket (ID: ${ticketId})`);
  }
  console.log('Evento nuevoComentario recibido:', ticketId, comentario);
  handleSocketEvent();
});

function handleSocketEvent() {
  if (!isEditing) {
    fetchAllTickets();
  } else {
    pendingRefresh = true;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = 'index.html';
    });
  }
});

const filterInput = document.getElementById('filterInput');
const estadoFiltro = document.getElementById('estadoFiltro');
const onlyDotsFiltro = document.getElementById('onlyDotsFiltro');
const dotFilterSection = document.getElementById('dotFilterSection');
let allTickets = [];

filterInput.addEventListener('keyup', applyFilters);
estadoFiltro.addEventListener('change', applyFilters);
onlyDotsFiltro.addEventListener('change', applyFilters);

function showOrHideDotFilter(tickets) {
  const hasAnyDot = tickets.some(ticket => ticket.nuevosComentarios?.compras);
  dotFilterSection.style.display = hasAnyDot ? 'flex' : 'none';
  if (!hasAnyDot) {
    onlyDotsFiltro.checked = false;
  }
}

function applyFilters() {
  const searchValue = filterInput.value.toLowerCase();
  const selectedEstado = estadoFiltro.value;
  const showOnlyDots = onlyDotsFiltro.checked;

  let filteredTickets = allTickets.filter(ticket =>
    JSON.stringify(ticket).toLowerCase().includes(searchValue)
  );

  if (selectedEstado) {
    filteredTickets = filteredTickets.filter(ticket => ticket.estado === selectedEstado);
  }

  if (showOnlyDots) {
    filteredTickets = filteredTickets.filter(ticket =>
      ticket.nuevosComentarios?.compras
    );
  }

  renderTickets(filteredTickets);
}

const comprasTicketList = document.getElementById('comprasTicketList');

function renderTickets(tickets) {
  comprasTicketList.innerHTML = `
    <table class="tickets-table">
      <thead>
        <tr>
          <th class="center-col">FECHA</th>
          <th>USUARIO</th>
          <th>CHASIS</th>
          <th>COD/POS</th>
          <th class="center-col">CANT</th>
          <th>CLIENTE</th>
          <th>COMENTARIO</th>
          <th class="center-col">C</th>
          <th class="center-col">ESTADO</th>
        </tr>
      </thead>
      <tbody id="ticketsTbody"></tbody>
    </table>
  `;

  const ticketsTbody = document.getElementById('ticketsTbody');
  const fragment = document.createDocumentFragment();

  tickets.forEach(ticket => {
    const estadoClass =
      ticket.estado === 'resuelto'
        ? 'estado-verde'
        : ticket.estado === 'negativo'
        ? 'estado-rojo'
        : 'estado-naranja';
    const fechaFormateada = new Date(ticket.fecha).toLocaleDateString('es-ES');

    const row = document.createElement('tr');
    const comentario = ticket.comentario || 'N/A';
    const comentarioTruncado = comentario.length > 10 ? comentario.slice(0, 10) + '...' : comentario;
    row.classList.add('ticket-header');
    row.innerHTML = `
      <td class="center-col">${fechaFormateada}</td>
      <td>${ticket.usuario?.username || 'N/A'}</td>
      <td>${ticket.chasis || 'N/A'}</td>
      <td>${ticket.cod_pos || 'N/A'}</td>
      <td class="center-col">${ticket.cant || 'N/A'}</td>
      <td>${ticket.cliente || 'N/A'}</td>
      <td>${comentarioTruncado || 'N/A'}</td>
      <td class="new-indicator center-col" id="new-${ticket._id}">
        ${
          (role === 'compras' && ticket.nuevosComentarios?.compras) ||
          (role === 'vendedor' && ticket.nuevosComentarios?.vendedor)
            ? '<span class="dot"></span>'
            : ''
        }
      </td>
      <td class="center-col">
        <span class="estado-circulo ${estadoClass}"></span>
        ${ticket.estado}
      </td>
    `;

    row.addEventListener('click', () => handleTicketClick(ticket));

    fragment.appendChild(row);
  });

  ticketsTbody.appendChild(fragment);

  if (openTicketId) {
    const ticket = tickets.find(t => t._id === openTicketId);
    if (ticket) {
      updateTicketModal(ticket);
    } else {
      openTicketId = null;
    }
  }
}

function handleTicketClick(ticket) {
  if (openTicketId === ticket._id) {
    closeTicketModal();
    return;
  }

  openTicketId = ticket._id;

  fetch(`/tickets/${ticket._id}/mark-read`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  .then(() => {
    document.getElementById(`new-${ticket._id}`).innerHTML = '';

    const idx = allTickets.findIndex(t => t._id === ticket._id);
    if (idx !== -1) {
      allTickets[idx].nuevosComentarios.compras = false;
    }

    const anyLeft = allTickets.some(t => t.nuevosComentarios?.compras);
    if (!anyLeft && onlyDotsFiltro.checked) {
      onlyDotsFiltro.checked = false;
      applyFilters();
    }
  })
  .catch(error => console.error('Error al marcar ticket como leído:', error));

  updateTicketModal(ticket);
}

function updateTicketModal(ticket) {
  isEditing = true;
  openTicketId = null;

  const modal = document.getElementById('ticketModal');
  const overlay = document.getElementById('overlay');
  overlay.style.display = 'block';
  modal.style.display = 'block';

  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      closeTicketModal();
    }
  });

  openTicketId = ticket._id;

  document.getElementById('modalShortId').textContent = `ID: ${ticket.shortId}`;
  document.getElementById('modalVendedor').textContent = ticket.usuario?.username || 'Desconocido';
  document.getElementById('modalChasis').textContent = ticket.chasis || 'N/A';
  document.getElementById('modalCodPos').textContent = ticket.cod_pos || 'N/A';
  document.getElementById('modalCant').textContent = ticket.cant || 'N/A';
  document.getElementById('modalCliente').textContent = ticket.cliente || 'N/A';
  document.getElementById('modalComentario').textContent = ticket.comentario || 'N/A';

  const modalResolucionSection = document.getElementById('modalResolucionSection');
  modalResolucionSection.innerHTML = '';
  if (ticket.estado === 'resuelto' || ticket.estado === 'negativo') {
    modalResolucionSection.innerHTML = `
      <h3>Resolución: 
        <span title="${ticket.estado}" class="circulo-detalle ${ticket.estado}"></span>
      </h3>
      <table class="ticket-table">
        <tr><th>RESOLUCIÓN</th><td>${ticket.resolucion || 'N/A'}</td></tr>
        <tr><th>COD/POS</th><td>${ticket.codigo}</td></tr>
        <tr><th>PROVEEDOR</th><td>${ticket.proveedor || 'N/A'}</td></tr>
        <tr><th>INGRESO</th><td>${ticket.ingreso || 'N/A'}</td></tr>
        <tr><th>CANTIDAD RESUELTA</th><td>${ticket.cantidad_resuelta || 'N/A'}</td></tr>
        <tr><th>COMENTARIO</th><td>${ticket.comentario_resolucion || 'N/A'}</td></tr>
      </table>
    `;
  }

  const modalResolverFormSection = document.getElementById('modalResolverFormSection');
  modalResolverFormSection.innerHTML = '';
  if (ticket.estado === 'pendiente') {
    modalResolverFormSection.innerHTML = `
      <form class="resolver-form" data-ticket-id="${ticket._id}">
        <div class="form-group">
          <label>Resolución</label>
          <input type="text" name="resolucion" required>
        </div>
        <div class="form-group">
          <label>Código</label>
          <input type="text" name="codigo">
        </div>
        <div class="form-group">
          <label>Cantidad Resuelta</label>
          <input type="number" name="cantidad_resuelta">
        </div>
        <div class="form-group">
          <label>Proveedor</label>
          <input type="text" name="proveedor">
        </div>
        <div class="form-group">
          <label>Ingreso</label>
          <input type="text" name="ingreso">
        </div>
        <div class="form-group">
          <label>Comentario de Resolución</label>
          <input type="text" name="comentario_resolucion">
        </div>
        <div class="form-group">
          <label>Estado</label>
          <select name="estado">
            <option value="resuelto">Resuelto</option>
            <option value="negativo">Negativo</option>
          </select>
        </div>
        <button type="submit" class="btn">Guardar Resolución</button>
      </form>
    `;

    const resolverForm = modalResolverFormSection.querySelector('.resolver-form');
    resolverForm.addEventListener('submit', handleResolverSubmit);
  }

  const commentsList = document.getElementById('commentsList');
  commentsList.innerHTML = ''; // Limpiar comentarios previos
  document.getElementById('commentForm').reset(); // Resetea el formulario de comentarios

  const commentForm = document.getElementById('commentForm');
  const oldForm = commentForm.cloneNode(true);
  commentForm.parentNode.replaceChild(oldForm, commentForm);

  oldForm.addEventListener('submit', handleCommentSubmit);

  fetchComments(ticket._id, commentsList);
}

function closeTicketModal() {
  openTicketId = null;
  const modal = document.getElementById('ticketModal');
  const overlay = document.getElementById('overlay');

  modal.style.display = 'none';
  overlay.style.display = 'none';

  isEditing = false;

  const commentsList = document.getElementById('commentsList');
  commentsList.innerHTML = '';

  const commentForm = document.getElementById('commentForm');
  const newCommentForm = commentForm.cloneNode(true);
  commentForm.parentNode.replaceChild(newCommentForm, commentForm);

  if (pendingRefresh) {
    pendingRefresh = false;
    fetchAllTickets();
  }
}

async function handleResolverSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const payload = {
    resolucion: formData.get('resolucion'),
    codigo: formData.get('codigo'),
    cantidad_resuelta: formData.get('cantidad_resuelta')
      ? Number(formData.get('cantidad_resuelta'))
      : undefined,
    proveedor: formData.get('proveedor'),
    ingreso: formData.get('ingreso'),
    comentario_resolucion: formData.get('comentario_resolucion'),
    avisado: formData.get('avisado') === 'true',
    pago: formData.get('pago') === 'true',
    estado: formData.get('estado'),
  };
  try {
    const res = await fetch(`/tickets/${e.target.dataset.ticketId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      alert('Ticket actualizado con éxito.');
      isEditing = false;
      closeTicketModal();
      fetchAllTickets();
    } else {
      const error = await res.json();
      alert(error.message || 'Error al actualizar el ticket');
    }
  } catch (error) {
    console.error('Error al actualizar el ticket:', error);
  }
}

async function fetchAllTickets() {
  try {
    const res = await fetch('/tickets', {
      headers: { Authorization: `Bearer ${token}` },
    });
    allTickets = await res.json();
    showOrHideDotFilter(allTickets);
    applyFilters();
  } catch (error) {
    console.error('Error al obtener tickets:', error);
  }
}

async function fetchComments(ticketId, commentsList) {
  try {
    const res = await fetch(`/tickets/${ticketId}/comments`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const comments = await res.json();

      commentsList.innerHTML = '';
      renderedCommentIds.clear();

      comments.forEach(comment => {
        if (!renderedCommentIds.has(comment._id)) {
          addCommentToList(commentsList, comment);
        }
      });
    } else {
      console.error('Error al cargar comentarios');
    }
  } catch (error) {
    console.error('Error al obtener comentarios:', error);
  }
}

let renderedCommentIds = new Set();

function addCommentToList(commentsList, comment) {
  if (renderedCommentIds.has(comment._id)) {
    console.log('Comentario ya renderizado, ignorando:', comment._id);
    return;
  }

  renderedCommentIds.add(comment._id);

  const commentItem = document.createElement('li');
  commentItem.dataset.commentId = comment._id;
  const dateFormatted = new Date(comment.fecha).toLocaleString('es-ES');
  const username = comment.usuario?.username || 'Usuario desconocido';

  const currentUserId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
  if (comment.usuario && comment.usuario._id === currentUserId) {
    commentItem.classList.add('self');
  }

  commentItem.innerHTML = `
    <span class="username">${username}</span>
    <span class="date">${dateFormatted}</span>
    <div class="comment-text">${comment.texto}</div>
  `;
  commentsList.appendChild(commentItem);
}

async function handleCommentSubmit(e) {
  e.preventDefault();
  const formData = new FormData(document.getElementById('commentForm'));
  const payload = {
    texto: formData.get('comment'),
    fecha: new Date().toISOString(),
  };

  try {
    const res = await fetch(`/tickets/${openTicketId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      document.getElementById('commentForm').reset();
    } else {
      console.error('Error al agregar comentario:', res.statusText);
    }
  } catch (error) {
    console.error('Error al agregar comentario:', error);
  }
}

const tituloCompras = document.getElementById('tituloCompras');
if (tituloCompras && username) {
  tituloCompras.textContent = `${username.toUpperCase()} - Urgentes`;
}

fetchAllTickets();