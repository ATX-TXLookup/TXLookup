# Miro MCP Integration

## Overview

TXLookup uses Miro boards as a visual output medium. When the agent completes research, analysis, or task execution, it can organize the results on a Miro board with frames, sticky notes, cards, and connectors.

## Miro API Setup

1. Create a Miro developer account at https://developers.miro.com
2. Create a new app in your Miro team
3. Set OAuth scopes: `boards:read`, `boards:write`
4. Get your access token
5. Set `MIRO_API_TOKEN` in `.env`

## API Reference

Base URL: `https://api.miro.com/v2`

### Boards
- `POST /boards` — Create a board
- `GET /boards/{id}` — Get board details

### Items
- `POST /boards/{id}/sticky_notes` — Add sticky note
- `POST /boards/{id}/cards` — Add card
- `POST /boards/{id}/frames` — Add frame
- `POST /boards/{id}/shapes` — Add shape
- `POST /boards/{id}/connectors` — Add connector

### Positioning
- Coordinates: x,y from center of board (0,0)
- Sticky note default size: 199x228
- Frame: set width/height explicitly
- Items inside frames: position relative to frame origin

## Color Mapping

Miro sticky note colors (use these exact values):

| Color | Hex | Use For |
|-------|-----|---------|
| yellow | #fff9b1 | Key findings |
| blue | #d5f692 | Data points |
| green | #c9df56 | Completed items |
| red | #f16c7f | Warnings |
| pink | #ee93c1 | Questions |
| orange | #f0d44d | Action items |

## MCP Bounty Requirements

The $500 Miro MCP bounty requires:
1. Working MCP server that exposes Miro operations as tools
2. Agent can create boards and populate them autonomously
3. Live demo showing board creation from a voice command
4. Clean visual layout (not random placement)
