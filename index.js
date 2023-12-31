const PORT = 8000;
const express = require('express');
const app = express();
const cheerio = require("cheerio");
const axios = require("axios");

const rashis = ["aries", "taurus", "gemini", "cancer", 
                    "leo", "virgo", "libra", "scorpio", 
                    "sagittarius", "capricorn", "aquarius", "pisces"];

const periods = ["yesterday", "daily", "tomorrow", "weekly", "monthly", "yearly"];

async function performScraping(rashi, perd) {
    var data = {
        "rashi": rashi
    };

    const axiosResponse = await axios.request({
        method: "GET",
        url: "https://www.ganeshaspeaks.com/horoscopes/" + perd + "-horoscope/" + rashi + "/",
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
        }
    });

    const $ = cheerio.load(axiosResponse.data);
    var content = $("#horo_content").text();

    content = content.replace("<br>", "");
    content = content.replace("</br>", "");

    data['rashifal'] = content;

    return data;
}

app.get('/all', async function (req, res) {
    var details = [];

    for(let x of rashis){
        details.push(await performScraping(x, "daily"));
    }

    const result = {
        'result': details
    };

    return res.status(200).json(result);
});

app.get('/:perd/all', async function (req, res) {
    var perd = req.params.perd.toLowerCase();

    if(perd == "today"){
        perd = "daily";
    }

    if(!periods.includes(perd)){
        return res.status(400).json({message: "Invalid Period"});
    }

    var details = [];

    for(let x of rashis){
        details.push(await performScraping(x, perd));
    }

    const result = {
        'result': details
    };

    return res.status(200).json(result);
});

app.get('/:name', async function(req, res) {
    const name = req.params.name.toLowerCase();

    if(!rashis.includes(name)){
        return res.status(400).json({message: "Invalid Rashi Name"});
    }

    const result = await performScraping(name, "daily");

    return res.status(200).json(result);
});

app.get('/:perd/:name', async function(req, res) {
    const name = req.params.name.toLowerCase();
    var perd = req.params.perd.toLowerCase();

    if(perd == "today"){
        perd = "daily";
    }

    if(!rashis.includes(name)){
        return res.status(400).json({message: "Invalid Rashi Name"});
    }
    if(!periods.includes(perd)){
        return res.status(400).json({message: "Invalid Period"});
    }

    const result = await performScraping(req.params.name, perd);

    return res.status(200).json(result);
});


app.listen(PORT, function () {
    console.log(`Server running at PORT number ${PORT}!`);
});