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
    if (!['vendedor', 'compras', 'cdr'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Acceso no autorizado' });
    }

    let tickets;

    if (req.user.role === 'vendedor' || req.user.role === 'cdr') {
      // Los vendedores ven solo sus tickets
      tickets = await Ticket.find({ usuario: req.user.id }).sort({ fecha: -1 });
    } else if (req.user.role === 'compras') {
      if (req.user.username === 'comprasadmin') {
        // El admin de compras puede ver todos los tickets
        tickets = await Ticket.find({}).sort({ fecha: -1 });
      } else {
        // Compradores específicos ven solo los tickets asignados
        tickets = await Ticket.find({ usuariosAsignados: req.user.id }).sort({ fecha: -1 });
      }
    }

    res.json(tickets);
  } catch (error) {
    console.error('Error al obtener tickets:', error);
    res.status(500).json({ error: 'Error interno al obtener tickets' });
  }
};




exports.getAllTickets = async (req, res) => {
  if (!['compras', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Acceso no autorizado' });
  }

  try {
    let filter = {};
    if (req.user.role === 'compras' && req.user.username !== 'comprasadmin') {
      // Solo tickets asignados al usuario actual de compras
      filter = { usuariosAsignados: req.user.id };
    }

    const tickets = await Ticket.find(filter)
      .sort({ fecha: -1 })
      .populate('usuario', 'username')
      .populate('usuariosAsignados', 'username'); // Mostrar detalles de los usuarios asignados

    res.json(tickets);
  } catch (error) {
    console.error('Error al obtener tickets:', error);
    res.status(500).json({ error: 'Error al obtener tickets' });
  }
};



exports.resolveTicket = async (req, res) => {
  console.log('resolveTicket -> Datos recibidos:', req.body);
  console.log('resolveTicket -> ID del ticket:', req.params.id);
  console.log('resolveTicket -> Rol del usuario:', req.user.role);

  if (!['compras', 'vendedor', 'cdr' ].includes(req.user.role)) {
    return res.status(403).json({ error: 'Acceso no autorizado' });
  }

  const { id } = req.params;
  const { resolucion, codigo, cantidad_resuelta, proveedor, ingreso, comentario_resolucion, avisado, pago, estado } = req.body;

  try {
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      console.log('resolveTicket -> Ticket no encontrado');
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    // Actualizaciones según el rol
    if (req.user.role === 'vendedor' || req.user.role === 'cdr') {
      if (avisado !== undefined) ticket.avisado = avisado;
      if (pago !== undefined) ticket.pago = pago;
    }

    if (req.user.role === 'compras') {
      if (resolucion !== undefined) ticket.resolucion = resolucion;
      if (codigo !== undefined) ticket.codigo = codigo;
      if (cantidad_resuelta !== undefined) ticket.cantidad_resuelta = cantidad_resuelta;
      if (proveedor !== undefined) ticket.proveedor = proveedor;
      if (ingreso !== undefined) ticket.ingreso = ingreso;
      if (comentario_resolucion !== undefined) ticket.comentario_resolucion = comentario_resolucion;
      if (estado && ['pendiente', 'resuelto', 'negativo'].includes(estado)) {
        ticket.estado = estado;
      }
    }

    await ticket.save();

    // Obtén la instancia de io:
    const io = getIO();
    io.emit('ticketActualizado', ticket);

    console.log('resolveTicket -> Ticket actualizado:', ticket);
    res.json(ticket);
  } catch (error) {
    console.error('resolveTicket -> Error al actualizar el ticket:', error.message);
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
    if (req.user.role === 'vendedor') {
      ticket.nuevosComentarios.compras = true;
    } else if (req.user.role === 'compras') {
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
