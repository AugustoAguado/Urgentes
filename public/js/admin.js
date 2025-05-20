let token = localStorage.getItem('token') || sessionStorage.getItem('token');
let role = localStorage.getItem('role') || sessionStorage.getItem('role');


// Si no hay token o no es rol "admin", se redirige
if (!token || role !== 'admin') {
  window.location.href = 'index.html';
}

// Logout
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

// Filtros
const filterInput = document.getElementById('filterInput');
const estadoFiltro = document.getElementById('estadoFiltro');
let allTickets = [];

// Aplicar filtros
function applyFilters() {
  const searchValue = filterInput.value.toLowerCase();
  const selectedEstado = estadoFiltro.value;

  // Filtro por texto y estado
  let filteredTickets = allTickets.filter(ticket => {
    const matchesSearch = JSON.stringify(ticket).toLowerCase().includes(searchValue);
    const matchesEstado = selectedEstado ? ticket.estado === selectedEstado : true;
    return matchesSearch && matchesEstado;
  });

  renderTickets(filteredTickets);
}

filterInput.addEventListener('keyup', applyFilters);
estadoFiltro.addEventListener('change', applyFilters);

// Contenedor donde se inyecta la tabla
const adminTicketList = document.getElementById('adminTicketList');

// Render de tickets
function renderTickets(tickets) {
  adminTicketList.innerHTML = `
    <table class="tickets-table">
      <thead>
        <tr>
          <th class="center-col">TICKET ID</th>
          <th class="center-col">FECHA</th>
          <th>USUARIO</th>
          <th>CHASIS</th>
          <th>COD/POS</th>
          <th class="center-col">CANT</th>
          <th>CLIENTE</th>
          <th class="center-col">ESTADO</th>
        </tr>
      </thead>
      <tbody>
        ${tickets.map(ticket => {
          const fechaFormateada = new Date(ticket.fecha).toLocaleDateString('es-ES');
          chasisTruncado = ticket.chasis ? ticket.chasis.slice(0, 10) + '...' : 'N/A';
          codPosTruncado = ticket.cod_pos ? ticket.cod_pos.slice(0, 10) + '...' : 'N/A';
          clienteTruncado = ticket.cliente ? ticket.cliente.slice(0, 10) + '...' : 'N/A';
          const estadoClass = 
            ticket.estado === 'resuelto' ? 'estado-verde' : 
            ticket.estado === 'negativo' ? 'estado-rojo' : 
            'estado-naranja';
          return `
            <tr data-id="${ticket._id}">
              <td class="center-col">${ticket.shortId}</td>
              <td class="center-col">${fechaFormateada}</td>
              <td>${ticket.usuario?.username || 'N/A'}</td>
              <td>${chasisTruncado || 'N/A'}</td>
              <td>${ codPosTruncado || 'N/A'}</td>
              <td class="center-col">${ticket.cant || 'N/A'}</td>
              <td>${clienteTruncado || 'N/A'}</td>
              <td class="center-col">
                <span class="estado-circulo ${estadoClass}"></span>
                ${ticket.estado}
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}


// Obtener todos los tickets
async function fetchAllTickets() {
  try {
    const res = await fetch('/tickets', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.error('Error al obtener tickets:', res.status, res.statusText);
      return;
    }

    allTickets = await res.json(); // Obtener todos los tickets
    renderTickets(allTickets);
  } catch (error) {
    console.error('Error al obtener tickets:', error);
  }
}




const fechaInicio = document.getElementById('fechaInicio');
const fechaFin = document.getElementById('fechaFin');
const exportarXLSX = document.getElementById('exportarXLSX');

// Filtro general
function applyFilters() {
  const searchValue = filterInput.value.toLowerCase();
  const selectedEstado = estadoFiltro.value;
  const inicio = fechaInicio.value ? new Date(fechaInicio.value) : null;
  const fin = fechaFin.value ? new Date(fechaFin.value) : null;

  // Aplicar filtros
  let filteredTickets = allTickets.filter(ticket => {
    const matchesSearch = JSON.stringify(ticket).toLowerCase().includes(searchValue);
    const matchesEstado = selectedEstado ? ticket.estado === selectedEstado : true;
    const ticketFecha = new Date(ticket.fecha);

    const matchesFecha =
      (!inicio || ticketFecha >= inicio) && (!fin || ticketFecha <= fin);

    return matchesSearch && matchesEstado && matchesFecha;
  });

  renderTickets(filteredTickets);
}





// Event listeners para los filtros
filterInput.addEventListener('keyup', applyFilters);
estadoFiltro.addEventListener('change', applyFilters);
fechaInicio.addEventListener('change', applyFilters);
fechaFin.addEventListener('change', applyFilters);



const modal = document.getElementById('columnSelectorModal');
const confirmExport = document.getElementById('confirmExport');
const cancelExport = document.getElementById('cancelExport');

// Mostrar el modal al hacer clic en exportar
exportarXLSX.addEventListener('click', () => {
  modal.style.display = 'block';
});

// Ocultar el modal al cancelar
cancelExport.addEventListener('click', () => {
  modal.style.display = 'none';
});


confirmExport.addEventListener('click', async () => {
  try {
    // Obtener las columnas seleccionadas
    const selectedColumns = Array.from(
      document.querySelectorAll('input[name="columns"]:checked')
    ).map((input) => input.value);

    if (!selectedColumns.length) {
      alert('Por favor selecciona al menos una columna para exportar.');
      return;
    }

    // Crear un nuevo libro y hoja de Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Tickets Filtrados');

    // Estilos de encabezados
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '333333' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: '000000' } },
        bottom: { style: 'thin', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: '000000' } },
      },
    };

    const contentStyle = {
      font: { color: { argb: '000000' } },
      alignment: { horizontal: 'left', vertical: 'middle' },
      border: {
        top: { style: 'thin', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: '000000' } },
        bottom: { style: 'thin', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: '000000' } },
      },
    };

    const estadoStyles = {
      pendiente: { font: { color: { argb: 'FFC000' } } }, // Amarillo
      resuelto: { font: { color: { argb: '00B050' } } }, // Verde
      negativo: { font: { color: { argb: 'FF0000' } } }, // Rojo
    };

    // Añadir encabezados
    worksheet.addRow(selectedColumns);
    worksheet.getRow(1).eachCell((cell) => {
      cell.style = headerStyle;
    });

    // Filtrar las filas visibles en la tabla
    const visibleRows = document.querySelectorAll('.tickets-table tbody tr');

    // Iterar sobre las filas visibles
    visibleRows.forEach((row) => {
      const ticketId = row.getAttribute('data-id');
      const ticket = allTickets.find((t) => t._id === ticketId); // Buscar en los datos originales

      const rowData = selectedColumns.map((column) => {
        switch (column) {
          case 'Ticket ID':
            return ticket.shortId;
          case 'Fecha':
            return new Date(ticket.fecha).toLocaleDateString('es-ES');
          case 'Usuario':
            return ticket.usuario?.username || 'N/A';
          case 'Chasis':
            return ticket.chasis || 'N/A';
          case 'Cod/Pos':
            return ticket.cod_pos || 'N/A';
          case 'Cantidad':
            return ticket.cant || 'N/A';
          case 'Cliente':
            return ticket.cliente || 'N/A';
          case 'Estado':
            return ticket.estado;
          case 'Rubro':
            return ticket.rubro || 'N/A';
          case 'Tipo':
            return ticket.tipo || 'N/A';
          default:
            return '';
        }
      });

      const newRow = worksheet.addRow(rowData);

      // Aplicar estilos a las celdas
      newRow.eachCell((cell, colNumber) => {
        cell.style = { ...contentStyle };

        // Estilo especial para la columna "Estado"
        if (selectedColumns[colNumber - 1] === 'Estado') {
          const estado = cell.value?.toLowerCase();
          if (estadoStyles[estado]) {
            cell.font = estadoStyles[estado].font;
          }
        }
      });
    });

    // Ajustar el ancho de las columnas automáticamente
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        maxLength = Math.max(maxLength, cell.value ? cell.value.toString().length : 0);
      });
      column.width = maxLength + 2; // Margen adicional
    });

    const now = new Date();
    const currentDate = now.toLocaleDateString('es-ES').replaceAll('/', '-');
    const currentTime = now.toLocaleTimeString('es-ES', { hour12: false }).replaceAll(':', '-');
    const fileName = `ticketsFiltrados_${currentDate}_${currentTime}.xlsx`;

    // Descargar el archivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();

    // Ocultar el modal
    modal.style.display = 'none';
  } catch (error) {
    console.error('Error al exportar:', error);
  }
});



// Botón
const borrarFiltrados = document.getElementById('borrarFiltrados');
borrarFiltrados.addEventListener('click', borrarTicketsFiltrados);

async function borrarTicketsFiltrados() {
  // Obtenemos todas las filas de la tabla que son visibles (ya filtradas)
  const rows = document.querySelectorAll('.tickets-table tbody tr');

  if (!rows.length) {
    alert('No hay tickets filtrados para borrar.');
    return;
  }

  // Confirmar antes de borrar
  const sure = confirm(`¿Estás seguro de borrar ${rows.length} tickets filtrados?`);
  if (!sure) return;

  // Borrado en serie (uno tras otro):
  for (let row of rows) {
    const ticketId = row.getAttribute('data-id');

    try {
      // Llamada DELETE a tu endpoint /tickets/:id
      const res = await fetch(`/tickets/${ticketId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        console.error(`No se pudo borrar ticket con ID ${ticketId}`, res.status, res.statusText);
      }
    } catch (error) {
      console.error('Error al borrar ticket', error);
    }
  }

  // Finalmente refrescamos la lista
  await fetchAllTickets();
  alert('Borrado completo.');
}

// Mostrar versión
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('/version');
    if (res.ok) {
      const { version } = await res.json();
      document.getElementById('version').textContent = version;
    } else {
      console.error('No se pudo obtener la versión');
    }
  } catch (error) {
    console.error('Error al obtener la versión:', error);
  }
});




// Llamada inicial
fetchAllTickets();
