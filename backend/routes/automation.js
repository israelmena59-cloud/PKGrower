const express = require('express');

/**
 * Automation Rules Route Module
 * Injects dependencies to handle global state (automationRules) and persistence (Firestore).
 */
module.exports = ({ getRules, addRule, deleteRule }) => {
    const router = express.Router();

    router.get('/', (req, res) => {
        try {
            res.json(getRules());
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/', async (req, res) => {
        try {
            const rule = req.body;
            // Business logic (ID generation, saving) handled by factory helper
            const newRule = await addRule(rule);
            res.json({ success: true, rule: newRule });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            await deleteRule(id);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};
