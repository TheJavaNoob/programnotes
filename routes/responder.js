var express = require('express');
const fs = require('fs');
const axios = require('axios');
var router = express.Router();
module.exports = router;

router.post("/search", async (req, res) => {
    const searchParam = JSON.parse(req.body);
    
});
