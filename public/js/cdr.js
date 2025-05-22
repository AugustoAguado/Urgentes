let token = localStorage.getItem('token') || sessionStorage.getItem('token');
let role = localStorage.getItem('role') || sessionStorage.getItem('role');
let username = localStorage.getItem('username') || sessionStorage.getItem('username');
const usuarioActualId = localStorage.getItem('userId') || sessionStorage.getItem('userId');

// Nueva variable global para recordar el ticket abierto
let openTicketId = null;

const socket = io();
socket.on('connect', () => {
  console.log('Conectado al servidor Socket.IO');
});
socket.on('nuevoTicket', (ticket) => {
  fetchMyTickets();
});
socket.on('ticketActualizado', (ticket) => {
  fetchMyTickets();
});
socket.on('nuevoComentario', ({ ticketId, comentario }) => {
  fetchMyTickets();
});
socket.on('comentariosLeidos', ({ ticketId, role }) => {
  showOrHideDotFilter(allTickets);
  updateDocumentTitle(); 
});

  socket.on('nuevaVersion', () => {
  const cartel = document.createElement('div');
  cartel.id = 'aviso-version';
  cartel.style.position = 'fixed';
  cartel.style.bottom = '0';
  cartel.style.left = '0';
  cartel.style.width = '100%';
  cartel.style.backgroundColor = '#ffd700';
  cartel.style.color = '#000';
  cartel.style.textAlign = 'center';
  cartel.style.padding = '1rem';
  cartel.style.zIndex = '9999';
  cartel.style.fontWeight = 'bold';
  cartel.style.boxShadow = '0 -2px 10px rgba(0,0,0,0.3)';
  cartel.innerText = 'Hay una nueva versión. Por favor, actualizá la página.';

  if (!document.getElementById('aviso-version')) {
    document.body.appendChild(cartel);
  }
});

if (!token || role !== 'cdr') {
  window.location.href = 'index.html';
}

const tituloVendedor = document.getElementById('tituloVendedor');
if (tituloVendedor && username) {
  username = username.toUpperCase()
  tituloVendedor.textContent = `${username} - Tickets`;
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

const ticketForm = document.getElementById('ticketForm');
ticketForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(ticketForm);
  const payload = {
    tipo: formData.get('tipo'),
    chasis: formData.get('chasis'),
    cod_pos: formData.get('cod_pos'),
    cant: Number(formData.get('cant')),
    comentario: formData.get('comentario'),
    cliente: formData.get('cliente'),
    rubro: formData.get('rubro'),
  };

  try {
    const res = await fetch('/tickets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok) {
      showInAppAlert('Ticket creado con éxito.');
      document.getElementById('crearTicketSection').style.display = 'none';
      ticketForm.reset();
      $('#rubro').val('').trigger('change');
      $('#tipoTicket').val('').trigger('change');
      fetchMyTickets();
    } else {
      showInAppAlert(data.error || 'Error al crear el ticket');
    }
  } catch (error) {
    console.error('Error al crear ticket:', error);
    showInAppAlert('Error al crear el ticket');
  }
});

const filterInput = document.getElementById('filterInput');
const estadoFiltro = document.getElementById('estadoFiltro');
const avisadoFiltro = document.getElementById('avisadoFiltro');
const pagoFiltro = document.getElementById('pagoFiltro');
const onlyDotsFiltro = document.getElementById('onlyDotsFiltro');
const dotFilterSection = document.getElementById('dotFilterSection');

let allTickets = [];

function showOrHideDotFilter(tickets) {
  const hasAnyDot = tickets.some(ticket => ticket.nuevosComentarios?.vendedor);
  if (hasAnyDot) {
    dotFilterSection.style.display = 'flex';
  } else {
    dotFilterSection.style.display = 'none';
    onlyDotsFiltro.checked = false;
  }
}

function applyFilters() {
  const searchValue = filterInput.value.toLowerCase();
  const selectedEstado = estadoFiltro.value;
  const selectedAvisado = avisadoFiltro.value;
  const selectedPago = pagoFiltro.value;
  const showOnlyDots = onlyDotsFiltro.checked;

  let filteredTickets = allTickets.filter(ticket =>
    JSON.stringify(ticket).toLowerCase().includes(searchValue)
  );

  if (selectedEstado) {
    filteredTickets = filteredTickets.filter(ticket => ticket.estado === selectedEstado);
  }
  if (selectedAvisado) {
    const boolAvisado = selectedAvisado === 'true';
    filteredTickets = filteredTickets.filter(ticket => ticket.avisado === boolAvisado);
  }
  if (selectedPago) {
    const boolPago = selectedPago === 'true';
    filteredTickets = filteredTickets.filter(ticket => ticket.pago === boolPago);
  }
  if (showOnlyDots) {
    filteredTickets = filteredTickets.filter(ticket =>
      ticket.nuevosComentarios?.vendedor
    );
  }
  renderTickets(filteredTickets);
}

filterInput.addEventListener('keyup', applyFilters);
estadoFiltro.addEventListener('change', applyFilters);
avisadoFiltro.addEventListener('change', applyFilters);
pagoFiltro.addEventListener('change', applyFilters);
onlyDotsFiltro.addEventListener('change', applyFilters);

const ticketList = document.getElementById('ticketList');

async function fetchMyTickets() {
  try {
    const res = await fetch('/tickets/mis', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Error al obtener tickets:', errorText);
      alert('Error al cargar los tickets: ' + errorText);
      return;
    }

    allTickets = await res.json();
    showOrHideDotFilter(allTickets);
    updateDocumentTitle(); 
    applyFilters();
  } catch (error) {
    console.error('Error al obtener tickets:', error);
    alert('Error al cargar los tickets');
  }
}

let ticketsToShow = 15; // Número inicial de tickets a mostrar
let currentOffset = 0; // Desplazamiento para cargar más tickets

function renderTickets(tickets) {
  ticketList.innerHTML = `
  <div class="table-container">
    <table class="tickets-table">
      <thead>
        <tr>
          <th class="center-col">FECHA</th>
          <th class="center-col">TIPO</th>
          <th class="center-col">CHASIS</th>
          <th class="center-col">COD/POS</th>
          <th class="center-col">CANT</th>
          <th class="center-col">CLIENTE</th>
          <th class="left-col">COMENTARIO</th>
          <th class="center-col">NOTIF</th>
          <th class="center-col">AVISADO</th>
          <th class="center-col">PAGO</th>
          <th class="center-col">ESTADO</th>
        </tr>
      </thead>
      <tbody id="ticketsTbody"></tbody>
    </table>
    <button id="loadMoreBtn" class="btn load-more">Cargar más</button>
  </div>
  `;

  const ticketsTbody = document.getElementById('ticketsTbody');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const visibleTickets = tickets.slice(0, ticketsToShow + currentOffset);

  visibleTickets.forEach(ticket => {
    const estadoClass =
      ticket.estado === 'resuelto'
        ? 'estado-verde'
        : ticket.estado === 'negativo'
        ? 'estado-rojo'
        : 'estado-naranja';

    const tipoClass =
      ticket.tipo === 'consulta'
        ? 'badge-consulta'
        : ticket.tipo === 'pendiente'
        ? 'badge-pendiente'
        : 'badge-urg';
        
    const avisadoClass = ticket.avisado ? 'yes' : 'no';
    const pagoClass = ticket.pago ? 'yes' : 'no';
    comentarioTruncado = ticket.comentario.length > 10 ? ticket.comentario.substring(0, 10) + '...' : ticket.comentario;
    codPosTruncado = ticket.cod_pos.length > 10 ? ticket.cod_pos.substring(0, 10) + '...' : ticket.cod_pos;
    chasisTruncado = ticket.chasis.length > 10 ? ticket.chasis.substring(0, 10) + '...' : ticket.chasis;
    clienteTruncado = ticket.cliente.length > 10 ? ticket.cliente.substring(0, 10) + '...' : ticket.cliente;
    const row = document.createElement('tr');
    row.setAttribute('data-id', ticket._id);
    if (ticket.estado === 'anulado') {
      row.classList.add('ticket-anulado'); // Aplica la clase para los tickets anulados
    }
    row.classList.add('ticket-header');
    row.innerHTML = `
      <td class="center-col">${new Date(ticket.fecha).toLocaleDateString('es-ES')}</td>
      <td class="center-col">
        <span class="badge ${tipoClass}">${ticket.tipo}</span>
      </td>
      <td class="center-col">${chasisTruncado || '--'}</td>
      <td class="center-col mayusc">${codPosTruncado || '--'}</td>
      <td class="center-col">${ticket.cant || '--'}</td>
      <td class="center-col">${clienteTruncado || '--'}</td>
      <td class="left-col">${comentarioTruncado || 'N/A'}</td>
      <td class="center-col new-indicator" id="new-${ticket._id}">
        ${
          ticket.nuevosComentarios?.vendedor &&
          ticket.usuario?._id !== usuarioActualId
            ? '<span class="dot"></span>'
            : ''
        }
      </td>
      <td class="center-col ${avisadoClass}">${ticket.avisado ? 'Sí' : 'No'}</td>
      <td class="center-col ${pagoClass}">${ticket.pago ? 'Sí' : 'No'}</td>
      <td class="center-col">
        <span class="estado-circulo ${estadoClass}"></span>
        ${ticket.estado}
      </td>
    `;

    const detailRow = document.createElement('tr');
    detailRow.classList.add('ticket-detalle');

    if (ticket._id === openTicketId) {
      detailRow.style.display = '';
      row.classList.add('open');
    } else {
      detailRow.style.display = 'none';
    }

    const detailCell = document.createElement('td');
    detailCell.colSpan = 11;

    let detalleContent = '';
    if (ticket.estado === 'negativo' || ticket.estado === 'resuelto') {
      detalleContent = `
        <span class="short-id">ID: ${ticket.shortId}</span>
        <table class="detalle-table">
          <tr><th>RESOLUCIÓN</th><td>${ticket.resolucion || '--'}</td></tr>
          <tr><th>COD/POS</th><td class="mayusc">${ticket.codigo}</td></tr>
          <tr><th>PROVEEDOR</th><td>${ticket.proveedor || '--'}</td></tr>
          <tr><th>INGRESO</th><td>${ticket.ingreso || '--'}</td></tr>
          <tr><th>CANTIDAD RESUELTA</th><td>${ticket.cantidad_resuelta || '--'}</td></tr>
          <tr><th>COMENTARIO</th><td>${ticket.comentario_resolucion || '--'}</td></tr>
          <tr><th>AVISADO</th><td>${ticket.avisado ? 'Sí' : 'No'}</td></tr>
          <tr><th>PAGO</th><td>${ticket.pago ? 'Sí' : 'No'}</td></tr>
        </table>
      `;
    } else {
      detalleContent = `
        <span class="short-id">ID: ${ticket.shortId}</span>
        <table class="detalle-table">
          <tr><th>TIPO</th><td><span class="badge ${tipoClass}">${ticket.tipo}</span></td></tr>
          <tr><th>CHASIS</th><td>${ticket.chasis || '--'}</td></tr>
          <tr><th>COD/POS</th><td class="mayusc">${ticket.cod_pos}</td></tr>
          <tr><th>CANT</th><td>${ticket.cant}</td></tr>
          <tr><th>CLIENTE</th><td>${ticket.cliente}</td></tr>
          <tr><th>COMENTARIO</th><td>${ticket.comentario || '--'}</td></tr>
          <tr><th>AVISADO</th><td>${ticket.avisado ? 'Sí' : 'No'}</td></tr>
          <tr><th>PAGO</th><td>${ticket.pago ? 'Sí' : 'No'}</td></tr>
        </table>
      `;
    }

    detalleContent += `
      <form class="edit-form" data-ticket-id="${ticket._id}">
        <div class="form-group">
          <label>¿Avisado?</label>
          <select name="avisado">
            <option value="false" ${!ticket.avisado ? 'selected' : ''}>No</option>
            <option value="true" ${ticket.avisado ? 'selected' : ''}>Sí</option>
          </select>
        </div>
        <div class="form-group">
          <label>¿Pago?</label>
          <select name="pago">
            <option value="false" ${!ticket.pago ? 'selected' : ''}>No</option>
            <option value="true" ${ticket.pago ? 'selected' : ''}>Sí</option>
          </select>
        </div>
        <button type="submit" class="btn">Guardar</button>
      </form>
        <button class="btn-anular-ticket" data-ticket-id="${ticket._id}">
      Anular Ticket
        </button>
      <div class="comments-section">
        <h4>Comentarios</h4>
        <ul class="comments-list" id="comments-${ticket._id}"></ul>
      </div>
    `;

    detailCell.innerHTML = detalleContent;
    detailRow.appendChild(detailCell);
    ticketsTbody.appendChild(row);
    ticketsTbody.appendChild(detailRow);

    const editForm = detailCell.querySelector('.edit-form');
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(editForm);
      const payload = {
        avisado: formData.get('avisado') === 'true',
        pago: formData.get('pago') === 'true',
      };
      try {
        const res = await fetch(`/tickets/${ticket._id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          fetchMyTickets();
        } else {
          const error = await res.json();
          alert(error.message || 'Error al guardar los cambios');
        }
      } catch (error) {
        console.error('Error al guardar cambios:', error);
        alert('Error al procesar la solicitud');
      }
    });

    const anularButton = detailRow.querySelector('.btn-anular-ticket');
    if (anularButton) {
      anularButton.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevenir que se abra o cierre el detalle del ticket
    
        // Confirmación antes de proceder con la anulación
        const confirmar = confirm('¿Estás seguro de que deseas anular este ticket? Esta acción no se puede deshacer.');
        if (!confirmar) {
          return; // Salir si el usuario cancela la confirmación
        }
    
        const ticketId = e.target.getAttribute('data-ticket-id');
        try {
          const res = await fetch(`/tickets/${ticketId}/anular`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });
    
          if (!res.ok) {
            const errorResponse = await res.json();
            throw new Error(errorResponse.error || 'Error al anular el ticket.');
          }
    
          alert(`El ticket con ID ${ticket.shortId} ha sido anulado.`);
          fetchMyTickets(); // Refresca la lista de tickets
        } catch (error) {
          console.error('Error al anular el ticket:', error);
          alert('Error al anular el ticket. Intente nuevamente.');
        }
      });
    }
    


    const commentsList = detailCell.querySelector(`#comments-${ticket._id}`);
    fetchComments(ticket._id, commentsList);

    row.addEventListener('click', async () => {
      const isClosed = detailRow.style.display === 'none';
      if (isClosed) {
        openTicketId = ticket._id;
        detailRow.style.display = '';
        row.classList.add('open');
        try {
          await fetch(`/tickets/${ticket._id}/mark-read`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
          document.getElementById(`new-${ticket._id}`).innerHTML = '';
          const idx = allTickets.findIndex(t => t._id === ticket._id);
          if (idx !== -1) {
            allTickets[idx].nuevosComentarios.vendedor = false;
          }
          const anyLeft = allTickets.some(t => t.nuevosComentarios?.vendedor);
          if (!anyLeft && onlyDotsFiltro.checked) {
            onlyDotsFiltro.checked = false;
            applyFilters();
          }
          updateDocumentTitle();  
        } catch (error) {
          console.error('Error al marcar ticket como leído:', error);
        }
      } else {
        openTicketId = null;
        detailRow.style.display = 'none';
        row.classList.remove('open');
      }
    });
  });

  // Lógica para cargar más tickets
  if (ticketsToShow + currentOffset >= tickets.length) {
    loadMoreBtn.style.display = 'none';
  } else {
    loadMoreBtn.style.display = 'block';
    loadMoreBtn.onclick = () => {
      currentOffset += ticketsToShow;
      renderTickets(tickets);
    };
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
      comments.forEach(comment => addCommentToList(commentsList, comment));
    } else {
      console.error('Error al cargar comentarios');
    }
  } catch (error) {
    console.error('Error al obtener comentarios:', error);
  }
}

function addCommentToList(commentsList, comment) {
  const commentItem = document.createElement('li');
  if (comment.usuario?._id === usuarioActualId) {
    commentItem.classList.add('self');
  }
  const dateFormatted = new Date(comment.fecha).toLocaleString('es-ES');
  const username = comment.usuario?.username || 'Usuario desconocido';
  commentItem.innerHTML = `
    <span class="username">${username}</span>
    <span class="date">${dateFormatted}</span>
    <div class="comment-text">${comment.texto}</div>
  `;
  commentsList.appendChild(commentItem);
}

const toggleCrearTicket = document.getElementById('toggleCrearTicket');
const crearTicketSection = document.getElementById('crearTicketSection');
if (toggleCrearTicket && crearTicketSection) {
  toggleCrearTicket.addEventListener('click', () => {
    const isHidden =
      crearTicketSection.style.display === 'none' ||
      crearTicketSection.style.display === '';
    crearTicketSection.style.display = isHidden ? 'block' : 'none';
  });
}

const inAppAlert = document.getElementById('inAppAlert');
const alertMessage = document.getElementById('alertMessage');
const alertCloseBtn = document.getElementById('alertCloseBtn');

function showInAppAlert(message) {
  alertMessage.textContent = message;
  inAppAlert.style.display = 'flex';
}

alertCloseBtn.addEventListener('click', () => {
  inAppAlert.style.display = 'none';
});

// Obtener referencias
const codPosInput = document.getElementById('cod_pos_input');
const rubroSelect = document.getElementById('rubro');

codPosInput.addEventListener('blur', async () => {
  const codPosValue = codPosInput.value.trim();
  if (!codPosValue) return;

  try {
    const res = await fetch(`/catalog/codpos/${encodeURIComponent(codPosValue)}`);
    if (!res.ok) {
      console.warn('No se encontró Cód/Pos:', codPosValue);
      return;
    }
    const data = await res.json();
    // data.rubro podría ser "BOMBA DE DIRECCION HIDRAULICA" por ejemplo

    // 3) Asignar al <select> con Select2
    // OJO: el string de data.rubro debe ser igual al <option value="...">
    $('#rubro').val(data.rubro).trigger('change');

  } catch (error) {
    console.error('Error al buscar rubro:', error);
  }
});

// Guarda el título original para poder restaurarlo cuando no haya notificaciones
const originalTitle = document.title;

// Crea un objeto Audio o referencia a la etiqueta <audio> en el HTML
const notificationSound = new Audio('../assets/system-notification-199277.mp3');
// Si es necesario, puedes forzar la precarga:
notificationSound.preload = 'auto';

// Variable para recordar cuántos tickets no leídos teníamos antes
let previousUnreadCount = 0;

// Función para actualizar el título del documento con el número de tickets sin leer
function updateDocumentTitle() {
  // Filtramos los tickets que tengan nuevos comentarios para 'vendedor'
  const unreadCount = allTickets.filter(ticket => ticket.nuevosComentarios?.vendedor).length;
  
  console.log('Tickets sin leer:', unreadCount, 'Anterior:', previousUnreadCount);
  
  // Actualizamos el título
  if (unreadCount > 0) {
    document.title = `(${unreadCount}) ${originalTitle}`;
  } else {
    document.title = originalTitle;
  }

  // Si el número de no leídos ha aumentado, reproducimos el sonido
  if (unreadCount > previousUnreadCount) {
    notificationSound.play().then(() => {
      console.log('Sonido reproducido correctamente.');
    }).catch(err => {
      console.error('No se pudo reproducir el sonido:', err);
    });
  }

  // Guardamos el nuevo valor de 'unreadCount' para comparaciones futuras
  previousUnreadCount = unreadCount;
}




fetchMyTickets();
