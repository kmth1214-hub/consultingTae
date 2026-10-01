# Decisions: Consumable Item Artwork

- Date: 2026-10-01
- Status: Confirmed

## D01. Consumable icons
- **Chosen**: Use these exact CookieRun Fan Kit images for the four consumable items:
  - 불공: `Cookie Run_ OvenBreak Fan Kit/03. Treasures/Fiery Candy Comet.png`
  - 방어: `Cookie Run_ OvenBreak Fan Kit/03. Treasures/Gigawatt Cube.png`
  - 회복: `Cookie Run_ OvenBreak Fan Kit/07. UI/Items/Mini Energy Potion.png`
  - 창: `Cookie Run_ OvenBreak Fan Kit/03. Treasures/Candy Cane Staff of Darkness.png`
- **Rationale**: These files are present in the supplied Fan Kit and match the updated image choices.

## D02. Repository asset handling
- **Chosen**: When implementing the UI, copy only these four selected images into a project asset folder and reference those copies; do not add the full Fan Kit directory to the GitHub repository.
- **Rationale**: The Git repository should contain only the assets used by the project.
