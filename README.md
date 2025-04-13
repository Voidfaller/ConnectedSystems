Eindopdracht | TI Connected Systems
==============
Dit project is ontwikkeld als eindopdracht voor het vak *Connected Systems* binnen de opleiding Technische Informatica. Het systeem bestaat uit een centrale server, meerdere Webots-robots (met elk een eigen controller), en een dashboard dat vanuit de browser kan worden gebruikt.

## Over het project

Het systeem simuleert een robotomgeving waarin meerdere robots taken ontvangen, uitvoeren en communiceren via een centraal protocol. De communicatie tussen de componenten verloopt via MQTT, en taken worden gepland en uitgevoerd op basis van gestructureerde JSON-berichten.

## Benodigdheden

- Docker  
- Docker Compose  
- Webots (voor het lokaal draaien van simulaties)  
- paho-mqtt library (voor het versturen van mqtt berichten in webots)

## Systeem Opzetten
### 1. Bestanden aanpassen
Om te zorgen dat het systeem correct werkt moet in een aantal bestanden het ip van de server worden veranderd naar het correcte IP-adres.

Voer het onderstaande commando uit op een terminal om te achterhalen wat het ipadres van de server is:

Windows:
```bash
ipconfig 
```
Zoek in de uitvoer naar het IPv4-adres van je actieve netwerkadapter, bijvoorbeeld:

```bash
IPv4 Address. . . . . . . . . . . : 192.168.1.23
```
Vervang in de volgende bestanden het ip met het ip dat je hebt gevonden:
```bash
/webots/controllers/MQTT_CLIENT/MQTT_CLIENT.py
/webots/controllers/MQTT_FOLLOWER/MQTT_FOLLOWER.py
/Server/nodejs/server.js
/Physical-module/src/main.cpp
/dashboard/public/script.js
```

### 2. Centrale server en MQTT broker starten
Navigeer naar 
```bash
/Server
```   
En voer dit commando uit op een terminal:
```bash
docker compose up -d
```
Dit zou de server en de mqtt broker moeten starten. controlleer dit door in de docker desktop app te kijken of de containers draaien

---

### 3. Dashboard starten
Navigeer naar 
```bash
/dashboard
```
En voer dit commando uit op een terminal:
```bash
docker compose up -d
```
het dashboard zou nu moeten draaien en te bereiken zijn op localhost

---
### 4. Webots opzetten
Open het volgende bestand in webots:
```bash
/webots/worlds/TINCOS_exam2022.wbt
```
Hiermee zou de webots wereld inclusief alle protos moeten zijn ingeladen. start de simulatie en nu zou het programma bruikbaar moeten zijn