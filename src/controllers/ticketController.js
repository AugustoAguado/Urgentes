// src/controllers/ticketController.js
const Ticket = require('../models/Ticket');
const { getIO } = require('../helpers/socket');
const User = require('../models/User');


exports.createTicket = async (req, res) => {
  const { chasis, cod_pos, cant, comentario, cliente, rubro, tipo } = req.body;

  if (!req.user || (req.user.role !== 'vendedor' && req.user.role !== 'cdr')) {
    return res.status(403).json({ error: 'Solo un vendedor o CDR puede crear tickets' });
  }  

  try {
    // Encuentra todos los compradores que gestionan este rubro
    const compradores = await User.find({
      role: 'compras',
      rubros: { $in: [rubro] },
    });

    if (!compradores.length) {
      return res.status(400).json({ error: 'No hay usuarios de compras que manejen este rubro.' });
    }

    const ticket = new Ticket({
      chasis,
      cod_pos,
      cant,
      comentario,
      cliente,
      rubro,
      tipo,
      usuariosAsignados: compradores.map((comprador) => comprador._id), // Asignar compradores
      usuario: req.user.id,
    });

    await ticket.save();

    const io = getIO();
    io.emit('nuevoTicket', ticket);

    res.status(201).json(ticket);
  } catch (error) {
    console.error('Error al crear ticket:', error);
    res.status(500).json({ error: 'Error al crear el ticket' });
  }
};


exports.getMyTickets = async (req, res) => {
  try {
    if (!['vendedor', 'compras', 'cdr', 'admincdr'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Acceso no autorizado' });
    }

    // Nuevo filtro de fecha si viene por query
    const fechaDesde = req.query.fechaDesde ? new Date  (req.query.fechaDesde) : null;
    let fechaFiltro = {};
    if (fechaDesde) {
      fechaFiltro.fecha = { $gte: fechaDesde };
    }

    let tickets;
    if (req.user.role === 'vendedor' || req.user.role === 'cdr') {
      tickets = await Ticket.find({ usuario: req.user.id, ...fechaFiltro }).sort({ fecha: -1 });
    } else if (req.user.role === 'compras' || req.user.role === 'admincdr') {
      if (req.user.username === 'comprasadmin') {
        tickets = await Ticket.find({ ...fechaFiltro }).sort({ fecha: -1 });
      } else {
        tickets = await Ticket.find({ usuariosAsignados: req.user.id, ...fechaFiltro }).sort({ fecha: -1 });
      }
    }

    res.json(tickets);
  } catch (error) {
    console.error('Error al obtener tickets:', error);
    res.status(500).json({ error: 'Error interno al obtener tickets' });
  }
};


// src/controllers/ticketController.js

exports.getAllTickets = async (req, res) => {
  // Roles permitidos
  if (!['compras', 'admin', 'admincdr'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Acceso no autorizado' });
  }

  try {
    const filter = {};

    // Si no vienen explicitamente soloUltimoMes=false, aplico filtro de 30 días
    const soloUltimoMes = req.query.soloUltimoMes !== 'false';
    if (soloUltimoMes) {
      const fechaLimite = new Date();
      fechaLimite.setMonth(fechaLimite.getMonth() - 1);
      filter.fecha = { $gte: fechaLimite };
    }

    // Si es compras “normal”, sólo tickets asignados
    if (req.user.role === 'compras' && req.user.username !== 'comprasadmin') {
      filter.usuariosAsignados = req.user.id;
    }
    // Si es admincdr, sólo tickets creados por usuarios cdr
    else if (req.user.role === 'admincdr') {
      const cdrIds = await User.find({ role: 'cdr' }).distinct('_id');
      filter.usuario = { $in: cdrIds };
    }
    // admin o comprasadmin ven todos (pero respeta el filtro de fecha si se dejó activo)

    const tickets = await Ticket.find(filter)
      .sort({ fecha: -1 })
      .populate('usuario', 'username')
      .populate('usuariosAsignados', 'username');

    res.json(tickets);
  } catch (error) {
    console.error('Error al obtener tickets:', error);
    res.status(500).json({ error: 'Error al obtener tickets' });
  }
};




exports.resolveTicket = async (req, res) => {
  if (!['compras', 'vendedor', 'cdr'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Acceso no autorizado' });
  }

  const { id } = req.params;
  const {
    resolucion,
    codigo,
    cantidad_resuelta,
    proveedor,
    comentario_resolucion,
    estado,  
    plazoEntrega,
    fechaIngreso,
  } = req.body;

  try {
    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });

    /* ─┤ Actualizaciones por rol ├─ */
    if (req.user.role === 'compras') {
      if (resolucion         !== undefined) ticket.resolucion         = resolucion;
      if (codigo             !== undefined) ticket.codigo             = codigo;
      if (cantidad_resuelta  !== undefined) ticket.cantidad_resuelta  = cantidad_resuelta;
      if (proveedor          !== undefined) ticket.proveedor          = proveedor;
      if (comentario_resolucion !== undefined) ticket.comentario_resolucion = comentario_resolucion;
      if (estado && ['pendiente', 'resuelto', 'negativo'].includes(estado)) {
        ticket.estado = estado;
      }
      if (fechaIngreso !== undefined) {
        ticket.fechaIngreso = fechaIngreso ? new Date(fechaIngreso) : undefined;
      }
      // NUEVO
    
      // valores admitidos
const PLAZOS_VALIDOS = ['3 a 5 días', '7 a 15 días', '15 a 20 días'];

if (plazoEntrega && PLAZOS_VALIDOS.includes(plazoEntrega)) {
  ticket.plazoEntrega = plazoEntrega;          // guarda cualquiera de los tres
} else if (plazoEntrega === '' || plazoEntrega === null) {
  ticket.plazoEntrega = undefined;             // por si el usuario lo borra
}


    }

    if (['vendedor', 'cdr'].includes(req.user.role)) {
      // sólo pueden marcar avisado / pago (si los tuvieses)
      if (req.body.avisado !== undefined) ticket.avisado = req.body.avisado;
      if (req.body.pago    !== undefined) ticket.pago    = req.body.pago;
    }

    await ticket.save();

    getIO().emit('ticketActualizado', ticket);
    res.json(ticket);
  } catch (err) {
    console.error('resolveTicket -> Error:', err);
    res.status(500).json({ error: 'Error al actualizar el ticket' });
  }
};




exports.addComment = async (req, res) => {
  try {
    const { texto } = req.body;

    if (!texto) {
      return res.status(400).json({ message: 'El texto del comentario es requerido' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket no encontrado' });
    }

    const nuevoComentario = {
      texto,
      fecha: new Date(),
      usuario: req.user.id,
    };

    ticket.comentarios.push(nuevoComentario);

    // Marcar nuevos comentarios para la otra parte
    if (req.user.role === 'vendedor' || req.user.role === 'admincdr') {
      ticket.nuevosComentarios.compras = true;
    } else if (req.user.role === 'compras' || req.user.role === 'admincdr') {
      ticket.nuevosComentarios.vendedor = true;
    }
    

    await ticket.save();

    const comentarioCompleto = await Ticket.findById(ticket._id)
    .select('comentarios')
    .populate('comentarios.usuario', 'username');
  
  const comentarioAgregado = comentarioCompleto.comentarios.slice(-1)[0];
  
  // Emitir solo el comentario agregado
  const io = getIO();
  io.emit('nuevoComentario', {
    ticketId: ticket._id, // Asociar explícitamente al ID del ticket
    comentario: comentarioAgregado, // Emitir solo el comentario recién agregado
  });
  
  res.status(201).json(comentarioAgregado); // Devolver solo el nuevo comentario
  
  } catch (error) {
    console.error('Error al agregar comentario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

exports.getComments = async (req, res) => {
  try {
    const { id } = req.params;

    // Encuentra el ticket y popula los usuarios en los comentarios
    const ticket = await Ticket.findById(id).populate('comentarios.usuario', 'username');
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    res.json(ticket.comentarios); // Devuelve los comentarios con información del usuario
  } catch (error) {
    console.error('Error al obtener comentarios:', error);
    res.status(500).json({ error: 'Error al obtener comentarios' });
  }
};


exports.markCommentsAsRead = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    if (req.user.role === 'vendedor' || req.user.role === 'cdr') {
      ticket.nuevosComentarios.vendedor = false;
    } else if (req.user.role === 'compras') {
      ticket.nuevosComentarios.compras = false;
    }

    await ticket.save();
    console.log('Ticket actualizado:', ticket);

    // Emitimos un evento "comentariosLeidos"
    const io = getIO();
    io.emit('comentariosLeidos', {
      ticketId: ticket._id,
      role: req.user.role
    });

    res.status(200).json({ message: 'Comentarios marcados como leídos' });
  } catch (error) {
    console.error('Error al marcar comentarios como leídos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.deleteTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Ticket.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    res.json({ message: 'Ticket eliminado con éxito' });
  } catch (error) {
    console.error('Error al eliminar ticket:', error);
    res.status(500).json({ error: 'Error al eliminar ticket' });
  }
};

exports.updateLlego = async (req, res) => {
  const { id } = req.params;
  const { llego } = req.body;

  try {
    if (!['si', 'no'].includes(llego)) {
      return res.status(400).send({ error: 'Valor inválido para "llego"' });
    }

    const updatedTicket = await Ticket.findByIdAndUpdate(
      id,
      { llego },
      { new: true }
    );

    if (!updatedTicket) {
      return res.status(404).send({ error: 'Ticket no encontrado' });
    }

    res.status(200).send({ message: 'Campo "Llegó" actualizado', ticket: updatedTicket });
  } catch (error) {
    console.error('Error al actualizar el campo "Llegó":', error);
    res.status(500).send({ error: 'Error interno del servidor' });
  }
};


exports.cancelTicket = async (req, res) => {
  const { id } = req.params;

  try {
    const updatedTicket = await Ticket.findByIdAndUpdate(
      id,
      { estado: 'anulado' },
      { new: true }
    );

    if (!updatedTicket) {
      return res.status(404).send({ error: 'Ticket no encontrado' });
    }

    res.status(200).send({ message: 'Ticket anulado con éxito', ticket: updatedTicket });
  } catch (error) {
    console.error('Error al anular el ticket:', error);
    res.status(500).send({ error: 'Error interno del servidor' });
  }
};

exports.updateRubro = async (req, res) => {
  try {
    // Solo "compras" puede cambiar el rubro
    if (req.user.role !== 'compras') {
      return res.status(403).json({ error: 'No autorizado para cambiar el rubro' });
    }

    const { id } = req.params;      // ID del ticket
    const { rubro } = req.body;     // Nuevo rubro a asignar

    if (!rubro) {
      return res.status(400).json({ error: 'Debe especificar un rubro' });
    }

    // 1. Buscar el ticket
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    // 2. Buscar usuarios de compras que tengan este rubro en su array
    const compradores = await User.find({
      role: 'compras',
      rubros: { $in: [rubro] }
    });

    if (!compradores.length) {
      return res
        .status(400)
        .json({ error: `No hay usuarios de compras que manejen el rubro: ${rubro}` });
    }

    // 3. Actualizar el rubro y reasignar a los nuevos compradores
    ticket.rubro = rubro;
    ticket.usuariosAsignados = compradores.map(c => c._id);
    await ticket.save();

    // 4. Responder con el ticket actualizado
    res.json({
      message: 'Rubro actualizado y ticket reasignado',
      ticket
    });
  } catch (error) {
    console.error('Error al cambiar el rubro del ticket:', error);
    res.status(500).json({ error: 'Error interno al cambiar el rubro' });
  }
};

// Devuelve los tickets urgentes (diarios para admincdr, mixtos para otros)
exports.getUrgentTickets = async (req, res) => {
  const rolesPermitidos = ['compras', 'vendedor', 'cdr', 'admincdr', 'admin'];
  if (!rolesPermitidos.includes(req.user.role)) {
    return res.status(403).json({ error: 'Acceso no autorizado' });
  }

  try {
    // calculo de hoy y mañana
    const hoy    = new Date(); hoy.setHours(0, 0, 0, 0);
    const mañana = new Date(hoy); mañana.setDate(hoy.getDate() + 1);

    // base del filtro: solo urgentes o pendientes
    const filter = {
      tipo: { $in: ['urgente', 'pendiente'] }
    };

    if (req.user.role === 'admincdr') {
      // Sólo los creados hoy por usuarios con rol 'cdr'
      const cdrIds = await User.find({ role: 'cdr' }).distinct('_id');
      filter.usuario       = { $in: cdrIds };
      filter.fechaIngreso  = { $gte: hoy, $lt: mañana };
    } else {
      // Comportamiento original para los demás roles
      filter.$or = [
        { fechaIngreso: { $gte: hoy, $lt: mañana } },               // ingresan hoy
        { plazoEntrega: { $in: ['3 a 5 días', '7 a 15 días', '15 a 20 días'] },
        llego: { $ne: 'si' }
        }       // o 7-15 días y no llegó
      ];
      if (req.user.role === 'compras' && req.user.username !== 'comprasadmin') {
        filter.usuariosAsignados = req.user.id;
      }
      if (req.user.role === 'vendedor' || req.user.role === 'cdr') {
        filter.usuario = req.user.id;
      }
      // admin y comprasadmin ven todo lo anterior
    }

    const tickets = await Ticket.find(filter)
      .sort({ fechaIngreso: -1 })
      .populate('usuario', 'username');

    res.json(tickets);
  } catch (err) {
    console.error('Error al obtener urgentes:', err);
    res.status(500).json({ error: 'Error interno al obtener urgentes' });
  }
};

