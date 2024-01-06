const PORT = process.env.PORT || 8000;
const express = require('express');
const app = express();
const cheerio = require("cheerio");
const axios = require("axios");
const wiki = require('wikipedia');

const rashis = ["aries", "taurus", "gemini", "cancer", 
                    "leo", "virgo", "libra", "scorpio", 
                    "sagittarius", "capricorn", "aquarius", "pisces"];

const periods = ["yesterday", "daily", "tomorrow", "weekly", "monthly", "yearly"];

const day_types = ["selected", "births", "deaths", "events", "holidays"];

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

function isValidDate(year, month, day) {
    if (year < 1) {
        return false;
    }

    if (month < 1 || month > 12) {
        return false;
    }

    const maxDaysInMonth = new Date(year, month, 0).getDate();

    if (day < 1 || day > maxDaysInMonth) {
        return false;
    }

    const currentDate = new Date();
    const inputDate = new Date(year, month - 1, day); // Month is zero-based in JavaScript Date objects

    return inputDate <= currentDate;
}

function getTypeSpecificContent(type, data){
    var result = {};

    if(type == "all"){
        var subresult = [];
        for(let x of data["selected"]){
            let event = {};
            event['title'] = x['text'];
            event['description'] = x['pages'][x['pages'].length-1]['extract'];
            event['year'] = x['year'];

            subresult.push(event);
        }

        result["selected"] = subresult;

        subresult = [];
        for(let x of data["births"]){
            let event = {};
            event['title'] = x['text'];
            event['description'] = x['pages'][0]['extract'];
            event['year'] = x['year'];

            subresult.push(event);
        }

        result["births"] = subresult;

        subresult = [];
        for(let x of data["deaths"]){
            let event = {};
            event['title'] = x['text'];
            event['description'] = x['pages'][0]['extract'];
            event['year'] = x['year'];

            subresult.push(event);
        }

        result["deaths"] = subresult;

        subresult = [];
        for(let x of data["events"]){
            let event = {};
            event['title'] = x['text'];
            event['description'] = x['pages'][0]['extract'];
            event['year'] = x['year'];

            subresult.push(event);
        }

        result["events"] = subresult;

        subresult = [];
        for(let x of data["holidays"]){
            let event = {};
            event['title'] = x['text'];
            event['description'] = x['pages'][0]['extract'];
            event['year'] = x['year'];

            subresult.push(event);
        }

        result["holidays"] = subresult;
    }
    if(type == "selected"){
        var subresult = [];
        for(let x of data[type]){
            let event = {};
            event['title'] = x['text'];
            event['description'] = x['pages'][x['pages'].length-1]['extract'];
            event['year'] = x['year'];

            subresult.push(event);
        }

        result[type] = subresult;
    }
    if(type == "births" || type == "deaths" || type == "events" || type == "holidays"){
        var subresult = [];
        for(let x of data[type]){
            let event = {};
            event['title'] = x['text'];
            event['description'] = x['pages'][0]['extract'];
            event['year'] = x['year'];

            subresult.push(event);
        }

        result[type] = subresult;
    }

    return result;
}

app.get('/rashifal/all', async function (req, res) {
    var details = [];

    for(let x of rashis){
        details.push(await performScraping(x, "daily"));
    }

    const result = {
        'result': details
    };

    return res.status(200).json(result);
});

app.get('/rashifal/:period/all', async function (req, res) {
    var perd = req.params.period.toLowerCase();

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

app.get('/rashifal/:rashi', async function(req, res) {
    var name = req.params.rashi.toLowerCase();

    if(!rashis.includes(name)){
        return res.status(400).json({message: "Invalid Rashi"});
    }

    const result = await performScraping(name, "daily");

    return res.status(200).json(result);
});

app.get('/rashifal/:period/:rashi', async function(req, res) {
    var name = req.params.rashi.toLowerCase();
    var perd = req.params.period.toLowerCase();

    if(perd == "today"){
        perd = "daily";
    }

    if(!rashis.includes(name)){
        return res.status(400).json({message: "Invalid Rashi"});
    }
    if(!periods.includes(perd)){
        return res.status(400).json({message: "Invalid Period"});
    }

    const result = await performScraping(name, perd);

    return res.status(200).json(result);
});

app.get('/dayfind/all/:mm/:dd', async (req, res) => {
    var month = req.params.mm;
    var day = req.params.dd;

    try {
        const data = await wiki.onThisDay({type: "all", month: month, day: day});
        
        if(!isValidDate(2020, month, day)){
            return res.status(400).json({message: "Invalid Day or Month"});
        }

        return res.status(200).json(getTypeSpecificContent("all", data));
    } catch (error) {
        console.log(error);
        return res.status(400).json({message: "Bad Request"});
    }
});

app.get('/dayfind/:type/:mm/:dd', async (req, res) => {
    var type = req.params.type.toLowerCase();
    var month = req.params.mm;
    var day = req.params.dd;

    try {
        const data = await wiki.onThisDay({type: type, month: month, day: day});
        
        if(!day_types.includes(type)){
            return res.status(400).json({message: "Invalid Type"});
        }
        if(!isValidDate(2020, month, day)){
            return res.status(400).json({message: "Invalid Day or Month"});
        }

        return res.status(200).json(getTypeSpecificContent(type, data));
    } catch (error) {
        console.log(error);
        return res.status(400).json({message: "Bad Request"});
    }
});

app.get('/birthday/:yyyy/:mm/:dd', async(req, res) => {
    const year = req.params.yyyy;
    const month = req.params.mm;
    const day = req.params.dd;
    const date = new Date(year + "-" + month + "-" + day);

    if(!isValidDate(year, month, day)){
        return res.status(400).json({message: "Invalid Date"});
    }

    const axiosResponse = await axios.request({
        method: "GET",
        url: "https://www.onthisday.com/birthdays/" + date.toLocaleString([], { month: 'long' }) + "/" + day + "/",
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
        }
    });

    const $ = cheerio.load(axiosResponse.data);
    const context = $('.person');
    var birthdays = [];

    context.each((index, el) => {
		var text = $(el).text();

        birthdays.unshift({
            "year": text.substring(0, 4),
            "description": text.substring(5)
        });
	});

    return res.status(200).json({"birthdays": birthdays});
});

app.get('/', (req, res) => {
    res.send('Myself Sanyam Jain welcomes you to my workspace.');
});

app.listen(PORT, function () {
    console.log(`Server running at PORT number ${PORT}!`);
});