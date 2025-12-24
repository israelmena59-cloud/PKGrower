const express = require('express');

/**
 * Calendar Route Module
 * Uses Factory Pattern to inject shared state (calendarEvents)
 * Unifies /api/calendar and /api/calendar/events
 */
module.exports = ({ getEvents, addEvent, removeEvent }) => {
    const router = express.Router();

    // Handler for getting events
    const handleGetEvents = (req, res) => {
        try {
            res.json(getEvents());
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };

    // Handler for creating events
    const handleCreateEvent = (req, res) => {
        try {
            const body = req.body;
            if (!body.title) return res.status(400).json({ error: 'Title required' });

            const event = {
                id: Date.now().toString(),
                ...body, // title, date, type, description
                createdAt: new Date().toISOString(),
            };
            addEvent(event);

            console.log('[CALENDAR] New Event:', event.title);
            res.status(201).json({ success: true, event });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };

    // Handler for deleting events
    const handleDeleteEvent = (req, res) => {
        try {
            const { id } = req.params;
            const success = removeEvent(id);
            if (success) {
                res.json({ success: true });
            } else {
                res.status(404).json({ error: 'Evento no encontrado' });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };

    // Routes (Supporting both / and /events for compatibility)
    router.get('/', handleGetEvents);
    router.get('/events', handleGetEvents);

    router.post('/', handleCreateEvent);
    router.post('/events', handleCreateEvent);

    router.delete('/:id', handleDeleteEvent);
    router.delete('/events/:id', handleDeleteEvent);

    return router;
};
