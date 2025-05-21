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
  const fechaInicio = document.getElementById('fechaInicio');
  const fechaFin = document.getElementById('fechaFin');
  const applyFiltersButton = document.getElementById('applyFilters');
  const exportXLSXButton = document.getElementById('exportXLSXButton');
  const tipoFiltro = document.getElementById('tipoFiltro'); // Capturamos el select de tipo

  let allTickets = [];

  filterInput.addEventListener('keyup', applyFilters);
  estadoFiltro.addEventListener('change', applyFilters);
  onlyDotsFiltro.addEventListener('change', applyFilters);
  fechaInicio.addEventListener('change', applyFilters); // Filtra automáticamente al cambiar la fecha de inicio
  fechaFin.addEventListener('change', applyFilters);   // Filtra automáticamente al cambiar la fecha de fin
  tipoFiltro.addEventListener('change', applyFilters); // Escuchamos cambios


  function showOrHideDotFilter(tickets) {
    const hasAnyDot = tickets.some(ticket => ticket.nuevosComentarios?.compras);
    dotFilterSection.style.display = hasAnyDot ? 'flex' : 'none';
    if (!hasAnyDot) {
      onlyDotsFiltro.checked = false;
    }
  }

  function applyFilters() {
    const searchValue = filterInput.value.trim().toLowerCase();
    const selectedEstado = estadoFiltro.value;
    const selectedTipo = tipoFiltro.value; // Capturamos el tipo seleccionado
    const inicio = fechaInicio.value ? new Date(fechaInicio.value) : null;
    const fin = fechaFin.value ? new Date(fechaFin.value) : null;
    const onlyDotsChecked = onlyDotsFiltro.checked;

    const filteredTickets = allTickets.filter(ticket => {
      const matchesSearch = JSON.stringify(ticket).toLowerCase().includes(searchValue);
      const matchesEstado = !selectedEstado || ticket.estado === selectedEstado;
      const matchesTipo = !selectedTipo || ticket.tipo === selectedTipo; // Nuevo filtro de tipo
      const matchesFecha =
        (!inicio || new Date(ticket.fecha) >= inicio) &&
        (!fin || new Date(ticket.fecha) <= fin);
      const matchesUnreadComments =
        !onlyDotsChecked || ticket.nuevosComentarios?.compras;

      return (
        matchesSearch &&
        matchesEstado &&
        matchesTipo && // Aplica el filtro de tipo
        matchesFecha &&
        matchesUnreadComments
      );
    });

    renderTickets(filteredTickets);
  }

  const comprasTicketList = document.getElementById('comprasTicketList');

  let ticketsToShow = 15; // Número inicial de tickets a mostrar
  let currentOffset = 0; // Desplazamiento para cargar más tickets

  function renderTickets(tickets) {
    comprasTicketList.innerHTML = `
      <table class="tickets-table">
        <thead>
          <tr>
            <th class="center-col">FECHA</th>
            <th class="center-col">TIPO</th>
            <th>USUARIO</th>
            <th>COD/POS</th>
            <th class="center-col">CANT</th>
            <th>CLIENTE</th>
            <th>COMENTARIO</th>
            <th class="center-col">C</th>
            <th class="center-col">ESTADO</th>
            <th class="center-col">LLEGÓ</th>
          </tr>
        </thead>
        <tbody id="ticketsTbody"></tbody>
      </table>
      <button id="loadMoreBtn" class="btn load-more">+</button>
    `;

    const ticketsTbody = document.getElementById('ticketsTbody');
    const fragment = document.createDocumentFragment();

    const visibleTickets = tickets.slice(0, ticketsToShow + currentOffset); // Mostrar solo los tickets visibles
    visibleTickets.forEach(ticket => {
      const estadoClass =
        ticket.estado === 'resuelto'
          ? 'estado-verde'
          : ticket.estado === 'negativo'
          ? 'estado-rojo'
          : ticket.estado === 'anulado'
          ? 'estado-anulado'
          : 'estado-naranja';

          const tipoClassMap = {
            consulta: 'badge-consulta',
            revision: 'badge-revision',
            pendiente: 'badge-pendiente',
            urgente: 'badge-urg'
          };
          
          const tipoClass = tipoClassMap[ticket.tipo] || 'default-class';
          

      const fechaFormateada = new Date(ticket.fecha).toLocaleDateString('es-ES');

      const row = document.createElement('tr');
      row.setAttribute('data-id', ticket._id);

      if (ticket.estado === 'anulado') {
        row.classList.add('ticket-anulado');
      }

      const comentario = ticket.comentario || 'N/A';
      const comentarioTruncado = comentario.length > 10 ? comentario.slice(0, 10) + '...' : comentario;
      const clienteTruncado = ticket.cliente?.length > 15 ? ticket.cliente.slice(0, 15) + '...' : ticket.cliente;
      codposTruncado = ticket.cod_pos?.length > 15 ? ticket.cod_pos.slice(0, 15) + '...' : ticket.cod_pos;
      row.classList.add('ticket-header');
      row.innerHTML = `
        <td class="center-col">${fechaFormateada}</td>
        <td class="center-col">
          <span class="badge ${tipoClass}">${ticket.tipo}</span>
        </td>
        <td>${ticket.usuario?.username || 'N/A'}</td>
        <td>${codposTruncado || 'N/A'}</td>
        <td class="center-col">${ticket.cant || 'N/A'}</td>
        <td>${clienteTruncado || 'N/A'}</td>
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
        <td class="center-col">
          <select class="llego-select ${ticket.llego === 'si' ? 'si' : 'no'}" data-ticket-id="${ticket._id}">
            <option value="no" ${ticket.llego === 'no' ? 'selected' : ''}>No</option>
            <option value="si" ${ticket.llego === 'si' ? 'selected' : ''}>Sí</option>
          </select>
        </td>
      `;



      // Prevenir que el select abra el ticket
      const selectElement = row.querySelector('.llego-select');
      selectElement.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      // Actualizar el valor del select en el servidor
      selectElement.addEventListener('change', async (e) => {
        const newValue = e.target.value;
        try {
          // Aplicar estilos dinámicamente
          selectElement.classList.remove('si', 'no');
          selectElement.classList.add(newValue === 'si' ? 'si' : 'no');

          const res = await fetch(`/tickets/${ticket._id}/update-llego`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ llego: newValue }),
          });
          if (!res.ok) {
            throw new Error('Error al actualizar el estado de "Llegó"');
          }
          console.log(`El estado de "Llegó" para el ticket ${ticket._id} se actualizó a ${newValue}`);
        } catch (error) {
          console.error('Error al actualizar el estado de "Llegó":', error);
          alert('Error al actualizar el estado de "Llegó". Intente nuevamente.');
        }
      });

      row.addEventListener('click', () => handleTicketClick(ticket));
      fragment.appendChild(row);
    });

    ticketsTbody.appendChild(fragment);

    // Mostrar o esconder el botón de "Cargar más"
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (ticketsToShow + currentOffset >= tickets.length) {
      loadMoreBtn.style.display = 'none';
    } else {
      loadMoreBtn.style.display = 'block';
      loadMoreBtn.addEventListener('click', () => {
        currentOffset += ticketsToShow; // Incrementar el desplazamiento
        renderTickets(tickets); // Renderizar con los nuevos tickets
      });
    }

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

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeTicketModal();
      }
    });

    openTicketId = ticket._id;


    document.getElementById('rubroActual').textContent = ticket.rubro || 'N/A';

    // Botón "Cambiar Rubro"
    const btnChangeRubro = document.getElementById('btnChangeRubro');
    const rubroSelectContainer = document.getElementById('rubroSelectContainer');
    btnChangeRubro.onclick = () => {
      const sure = confirm('¿Seguro que quieres cambiar el rubro?');
      if (!sure) return;
      rubroSelectContainer.style.display = 'block'; // Muestra el select
    };

    // Al click en "Guardar"
    const saveRubroBtn = document.getElementById('saveRubroBtn');
    saveRubroBtn.onclick = async () => {
      const newRubro = document.getElementById('rubroSelect').value;
      if (!newRubro) {
        alert('Selecciona un rubro');
        return;
      }
      try {
        const res = await fetch(`/tickets/${ticket._id}/update-rubro`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ rubro: newRubro })
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Error al actualizar rubro');
        }
        alert('Rubro actualizado con éxito');
        // Actualiza la UI
        fetchAllTickets();
        rubroSelectContainer.style.display = 'none';
        document.getElementById('rubroActual').textContent = newRubro;
      } catch (error) {
        console.error('Error al cambiar rubro:', error);
        alert(error.message);
      }
    };














    // Actualizamos la información del modal
    document.getElementById('modalShortId').textContent = `ID: ${ticket.shortId}`;
    document.getElementById('modalFecha').textContent = `H: ${new Date(ticket.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    document.getElementById('modalTipo').textContent = ticket.tipo || 'N/A';  
    document.getElementById('modalVendedor').textContent = ticket.usuario?.username || 'Desconocido';
    document.getElementById('modalChasis').textContent = ticket.chasis || 'N/A';
    document.getElementById('modalCodPos').textContent = ticket.cod_pos || 'N/A';
    document.getElementById('modalCant').textContent = ticket.cant || 'N/A';
    document.getElementById('modalCliente').textContent = ticket.cliente || 'N/A';
    document.getElementById('modalComentario').textContent = ticket.comentario || 'N/A';

    // Agregamos el tipo de ticket al modal
    const tipoClassMap = {
      consulta: 'badge-consulta',
      revision: 'badge-revision',
      pendiente: 'badge-pendiente',
      urgente: 'badge-urg'
    };
    
    const tipoClass = tipoClassMap[ticket.tipo] || 'default-class';

  const tipoTicketElement = document.getElementById('modalTipo');
  if (tipoTicketElement) {
    tipoTicketElement.innerHTML = `<span class="badge ${tipoClass}">${ticket.tipo}</span>`;
  }


    const modalResolucionSection = document.getElementById('modalResolucionSection');
  
    const fechaIngStr = ticket.fechaIngreso
              ? new Date(ticket.fechaIngreso).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: '2-digit'
              })
          : (ticket.plazoEntrega || '--');

    modalResolucionSection.innerHTML = '';
    if (ticket.estado === 'resuelto' || ticket.estado === 'negativo' || ticket.estado === 'anulado') {
      modalResolucionSection.innerHTML = `
        <h3>Resolución: 
          <span title="${ticket.estado}" class="circulo-detalle ${ticket.estado}"></span>
        </h3>
        <table class="ticket-table">
          <tr><th>RESOLUCIÓN</th><td>${ticket.resolucion || 'N/A'}</td></tr>
          <tr><th>COD/POS</th><td>${ticket.codigo}</td></tr>
          <tr><th>PROVEEDOR</th><td>${ticket.proveedor || 'N/A'}</td></tr>
          <tr><th>INGRESO</th><td>${ticket.fechaIngreso ? fechaIngStr : (ticket.plazoEntrega || 'N/A')}</td></tr>
          <tr><th>CANTIDAD RESUELTA</th><td>${ticket.cantidad_resuelta || 'N/A'}</td></tr>
          <tr><th>COMENTARIO</th><td>${ticket.comentario_resolucion || 'N/A'}</td></tr>
        </table>
      `;
    }

    const modalResolverFormSection = document.getElementById('modalResolverFormSection');

    modalResolverFormSection.innerHTML = '';

    /* ➊ Sólo construimos el formulario si el ticket aún está pendiente */
    if (ticket.estado === 'pendiente') {
    
      /* ➋ Bloque “Fecha / 7-15 días” sólo para tipos urgente o pendiente */
      let fechaBlock = '';
      if (ticket.tipo === 'urgente' || ticket.tipo === 'pendiente') {
 fechaBlock = `
<div class="form-group">
  <label>Fecha de Ingreso (dd-mm)</label>
  <input type="text"
         id="fechaIngresoInput"
         name="fecha_ingreso"
         placeholder="05-06"
         pattern="\\d{2}-\\d{2}"
         maxlength="5"
         required>
</div>

<div class="form-group">
  <label>Plazo de Entrega</label>
  <select id="plazoSelect" name="plazoSelect">
    <option value="">-- Seleccioná --</option>
    <option value="3 a 5 días">de 3 a 5 días</option>
    <option value="7 a 15 días">de 7 a 15 días</option>
    <option value="15 a 20 días">de 15 a 20 días</option>
  </select>
</div>
`;
      }
    
      /* ➌ Plantilla completa */
      modalResolverFormSection.innerHTML = `
        <form class="resolver-form" data-ticket-id="${ticket._id}">
          <div class="form-group">
            <label>Resolución</label>
            <input type="text" name="resolucion" required>
          </div>
          <div class="form-group">
            <label>Código</label>
            <input type="text" name="codigo" required>
          </div>
          <div class="form-group">
            <label>Cantidad Resuelta</label>
            <input type="number" name="cantidad_resuelta" required>
          </div>
          <div class="form-group">
            <label>Proveedor</label>
            <input type="text" name="proveedor" required>
          </div>
    
          ${fechaBlock}   <!-- se inserta sólo si corresponde -->
    
          <div class="form-group">
            <label>Comentario de Resolución</label>
            <input type="text" name="comentario_resolucion">
          </div>
          <div class="form-group">
            <label>Estado</label>
            <select name="estado" required>
              <option value="resuelto">Resuelto</option>
              <option value="negativo">Negativo</option>
            </select>
          </div>
          <button type="submit" class="btn">Guardar Resolución</button>
        </form>
      `;
    
      /* ➍ Si el bloque fecha existe, habilitamos/deshabilitamos el input */
    const resolverForm = modalResolverFormSection.querySelector('.resolver-form');
    const fechaInput   = resolverForm.querySelector('#fechaIngresoInput');
    const estadoSelect = resolverForm.querySelector('select[name="estado"]');
    const plazoSelect  = resolverForm.querySelector('#plazoSelect');

  const toggleFechaFields = () => {
    const isNegativo   = estadoSelect.value === 'negativo';
    const plazoElegido = plazoSelect.value !== '';

    fechaInput.disabled = isNegativo || plazoElegido;
    fechaInput.required = !isNegativo && !plazoElegido;
    if (fechaInput.disabled) fechaInput.value = '';
    plazoSelect.disabled = isNegativo;         // no tiene sentido plazo para negativos
  };

  plazoSelect.addEventListener('change', toggleFechaFields);
  estadoSelect.addEventListener('change', toggleFechaFields);
  toggleFechaFields();   // estado inicial
    
    
      resolverForm.addEventListener('submit', handleResolverSubmit);
    }

    /* carga inicial + bind del formulario */
  const commentsList = document.getElementById('commentsList');
  if (commentsList) fetchComments(ticket._id, commentsList);
  bindCommentForm(ticket._id);
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

  document.getElementById('commentForm')?.reset();


    if (pendingRefresh) {
      pendingRefresh = false;
      fetchAllTickets();
    }
  }


  async function fetchAllTickets() {
    try {
      const unMesAtras = new Date();
      // Removed unused variable 'fechaDesde'
      // const fechaDesde = unMesAtras.toISOString();
      const fechaDesde = unMesAtras.toISOString();

      const res = await fetch(`/tickets?soloUltimoMes=true`, {
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
        comments.forEach(c => addCommentToList(commentsList, c));
      } else {
        console.error('Error al cargar comentarios');
      }
    } catch (err) {
      console.error('Error al obtener comentarios:', err);
    }
  }




  let renderedCommentIds = new Set();


  /* ------------------------------------------------------------------ */
  /*  Vincula el <form id="commentForm"> con submit por fetch, sin GET   */
  function bindCommentForm(ticketId) {
    const form = document.getElementById('commentForm');
    const list = document.getElementById('commentsList');
    if (!form) return;

    form.onsubmit = async (e) => {
      e.preventDefault();                       // ← evita ?comment=... en la URL
      const texto = form.elements.comment.value.trim();
      if (!texto) return;

      try {
        const res = await fetch(`/tickets/${ticketId}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ texto })
        });
        if (res.ok) {
          const nuevo = await res.json();
          addCommentToList(list, nuevo);
          form.reset();
        } else {
          alert('Error al agregar comentario');
        }
      } catch (err) {
        console.error('Error al enviar comentario:', err);
        alert('Error de conexión');
      }
    };
  }
  /* ------------------------------------------------------------------ */



  function addCommentToList(commentsList, comment) {
    if (renderedCommentIds.has(comment._id)) return;   // ya lo mostraste

    renderedCommentIds.add(comment._id);

    const commentItem = document.createElement('li');
    commentItem.dataset.commentId = comment._id;

    const dateFormatted = new Date(comment.fecha).toLocaleString('es-ES');
    const username      = comment.usuario?.username || 'Usuario desconocido';

    if (comment.usuario?._id === (localStorage.getItem('userId') ||
                                  sessionStorage.getItem('userId'))) {
      commentItem.classList.add('self');
    }

    commentItem.innerHTML = `
      <span class="username">${username}</span>
      <span class="date">${dateFormatted}</span>
      <div class="comment-text">${comment.texto}</div>
    `;

    /*  ─────  📌 LO QUE FALTABA  ─────  */
    commentsList.appendChild(commentItem);           // ← ¡inserta el <li>!
    commentsList.scrollTop = commentsList.scrollHeight; // auto-scroll
  }



  async function handleResolverSubmit(e) {
    e.preventDefault();
    const fd           = new FormData(e.target);
    const estado       = fd.get('estado');          // resuelto | negativo
    const plazoElegido = fd.get('plazoSelect');     // '' | '3 a 5 días' | '7 a 15 días' | '15 a 20 días'

    let fechaIngreso, plazoEntrega;

    if (estado === 'negativo') {
      // ni fecha ni plazo
    } else if (plazoElegido) {
      plazoEntrega = plazoElegido;                  // cualquiera de las tres bandas
    } else {
      const fechaStr = (fd.get('fecha_ingreso') || '').trim();
      if (!/^\d{2}-\d{2}$/.test(fechaStr)) {
        alert('Ingresá la fecha como dd-mm (ej. 05-06) o seleccioná un plazo');
        return;
      }
      const [d, m] = fechaStr.split('-');
      const y      = new Date().getFullYear();
      fechaIngreso = new Date(`${y}-${m}-${d}T00:00:00`).toISOString();
    }

    /* ---------- payload ---------- */
    const payload = {
      resolucion:            fd.get('resolucion')            || undefined,
      codigo:                fd.get('codigo')                || undefined,
      cantidad_resuelta:     fd.get('cantidad_resuelta')
                            ? Number(fd.get('cantidad_resuelta')) : undefined,
      proveedor:             fd.get('proveedor')             || undefined,
      comentario_resolucion: fd.get('comentario_resolucion') || undefined,
      estado
    };
    if (fechaIngreso) payload.fechaIngreso = fechaIngreso;
    if (plazoEntrega) payload.plazoEntrega = plazoEntrega;

    /* ---------- envío ---------- */
    try {
      const res = await fetch(`/tickets/${e.target.dataset.ticketId}`, {
        method : 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization : `Bearer ${token}`
        },
        body   : JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Ticket actualizado con éxito');
        closeTicketModal();
      } else {
        const err = await res.json();
        alert(err.error || 'No se pudo actualizar el ticket');
      }
    } catch (err) {
      console.error('Error al actualizar:', err);
      alert('Error de conexión al actualizar el ticket.');
    }
  }




  const tituloCompras = document.getElementById('tituloCompras');
  if (tituloCompras && username) {
    tituloCompras.textContent = `${username.toUpperCase()} - Tickets`;
  }

  exportXLSXButton.addEventListener('click', async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Tickets Filtrados');

      // Encabezados
      const headers = ['Fecha', 'Código', 'Cantidad','Proveedor', 'Usuario', 'Cliente', 'Ingreso', 'Llegó'];
      worksheet.addRow(headers);

      // Estilos para los encabezados
      worksheet.getRow(1).eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFF' } }; // Negrita y texto blanco
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4F81BD' }, // Color de fondo azul
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' }; // Centrado
        cell.border = {
          top: { style: 'thin', color: { argb: '000000' } },
          left: { style: 'thin', color: { argb: '000000' } },
          bottom: { style: 'thin', color: { argb: '000000' } },
          right: { style: 'thin', color: { argb: '000000' } },
        };
      });

      // Filtrar los tickets visibles en la tabla
      const ticketsTbody = document.getElementById('ticketsTbody');
      const visibleRows = ticketsTbody.querySelectorAll('tr');

      if (visibleRows.length === 0) {
        alert('No hay tickets visibles para exportar.');
        return;
      }

      visibleRows.forEach(row => {
        const ticketId = row.getAttribute('data-id');
        const ticket = allTickets.find(t => t._id === ticketId);

        if (ticket) {
          const rowData = [
            ticket.fecha ? new Date(ticket.fecha).toLocaleDateString('es-ES') : 'N/A',
            ticket.codigo || 'N/A',
            ticket.cantidad_resuelta || 'N/A',
            ticket.proveedor || 'N/A',
            ticket.usuario?.username || 'N/A',
            ticket.cliente || 'N/A',
            ticket.ingreso || 'N/A',
            ticket.llego || 'N/A',
          ];
          const newRow = worksheet.addRow(rowData);

          // Estilo para las celdas del cuerpo
          newRow.eachCell(cell => {
            cell.font = { color: { argb: '000000' } }; // Texto negro
            cell.alignment = { horizontal: 'left', vertical: 'middle' }; // Alineado a la izquierda
            cell.border = {
              top: { style: 'thin', color: { argb: '000000' } },
              left: { style: 'thin', color: { argb: '000000' } },
              bottom: { style: 'thin', color: { argb: '000000' } },
              right: { style: 'thin', color: { argb: '000000' } },
            };
          });
        }
      });

      // Ajuste de ancho automático para las columnas
      worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
          const value = cell.value || '';
          maxLength = Math.max(maxLength, value.toString().length);
        });
        column.width = maxLength + 2; // Margen adicional
      });

      // Descargar el archivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const now = new Date();
      const formattedDate = now.toISOString().split('T')[0];
      const fileName = `Tickets_Filtrados_${formattedDate}.xlsx`;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('Ocurrió un error al exportar los tickets.');
    }
  });


  fetchAllTickets();