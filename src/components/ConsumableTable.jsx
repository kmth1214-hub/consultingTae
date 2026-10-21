import React from 'react';
import { BattleEngine } from '../game/battleEngine.js';
import { ASSETS } from '../game/assetCatalog.js';
import AssetImage from './AssetImage.jsx';

export default function ConsumableTable({ run, disabled, onConsumable }) {
  return <div className="consumable-hud hud-surface">
    <table><caption>소모품 <span>숫자키 1–4</span></caption><thead className="sr-only"><tr>
      <th>단축키</th><th>아이템</th><th>보유량</th><th>동작</th></tr></thead>
      <tbody>{BattleEngine.CONSUMABLE_CATALOG.map((item, index) => <tr key={item.id}>
        <td><kbd>{index + 1}</kbd></td><th scope="row"><AssetImage src={ASSETS.items[item.id]} /><span>{item.name}</span></th>
        <td>{run.inventory[item.id]}</td><td><button aria-label={`${item.name} 사용`}
          disabled={disabled || run.inventory[item.id] === 0 || run.consumablesBlocked}
          title={run.consumablesBlocked ? '얼음 숨결 · 이번 턴 사용 불가' : item.description}
          onClick={() => onConsumable(item.id)}>사용</button></td>
      </tr>)}</tbody>
    </table>
    {run.consumablesBlocked && <p className="item-lockout">얼음 숨결 · 사탕을 발사해 해제</p>}
  </div>;
}
