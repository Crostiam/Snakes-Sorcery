🐍 Snakes & Sorcery ✨

Snakes & Sorcery is a chaotic, spell-slinging, real-time multiplayer twist on the classic game of Snakes and Ladders. Choose your hero, roll the physics-based 3D dice, cast devastating spells, and race your friends to tile 100!

🎲 Features

Real-time Multiplayer: Create a private room code and invite your friends to play instantly.

Physics-Based 3D Dice: Grab the dice and physically pull it back like a slingshot to throw it across the tavern table.

6 Unique Hero Classes: Every player chooses a class with unique passive abilities:

🛡️ Knight: Immune to your first Snake or Curse. Blessings are twice as effective.

⚡ Rogue: Naturally quick, adding +1 to all your dice rolls permanently.

✨ Mage: Starts the game with an exclusive, highly powerful spell card.

💀 Warlock: Corrupts blessings, turning them into severe targeted curses against opponents.

🔥 Berserker: Relentless (1s automatically become 2s) and becomes "Enraged" (+2 to next roll) if hit by an enemy spell.

🧪 Alchemist: A brewmaster who draws an extra spell card whenever landing on a card tile.

Spell Cards: Land on special blue tiles to draw from a deck of magical cards. Cast spells like Sabotage to push opponents back, Illusion Swap to trade places, or Thief to steal their hard-earned cards.

Dynamic Board Generation: Play on the classic layout, or let the host configure a completely custom board with more curses, more blessings, and maximum chaos.

🕹️ How to Play

Host a Game: Enter your name, choose an avatar and class, and click "Create Room". Share the 4-letter code with your friends.

Roll the Dice: When it's your turn, click "Open Dice Tray". Click and drag the 3D dice downwards, then release to launch it!

Move: Once the math resolves (accounting for your base roll + any class modifiers or curses), physically drag your token to the highlighted glowing space.

Survive the Board: * 🪜 Ladders: Instantly climb to a higher space.

🐍 Snakes: Slide down to a lower space.

✨ Blessings: Gain +1 to your next two rolls.

💀 Curses: Suffer a -1 penalty to your next two rolls and discard a spell card.

🃏 Spell Cards: Draw a powerful magic card to use on your turn.

🛠️ Tech Stack

Frontend: React (Vite)

Styling: Tailwind CSS (v4)

Backend / Multiplayer Engine: Firebase (Firestore real-time listeners & Anonymous Authentication)

Physics: Custom CSS 3D Transforms and RequestAnimationFrame loop.

🚀 Running Locally

To run this project on your local machine:

Clone the repository:

git clone [https://github.com/](https://github.com/)<YOUR-USERNAME>/snakes-and-sorcery.git
cd snakes-and-sorcery


Install dependencies:

npm install


Start the development server:

npm run dev


Note: You will need to add your own Firebase configuration to App.jsx to enable multiplayer functionality.
