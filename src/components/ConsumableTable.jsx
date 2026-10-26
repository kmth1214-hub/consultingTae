import React from 'react';
import { BattleEngine } from '../game/battleEngine.js';
import { ASSETS } from '../game/assetCatalog.js';
import AssetImage from './AssetImage.jsx';

export default function ConsumableTable({ run, disabled, onConsumable }) {
  return <div className="consumable-hud hud-surface">
    <table><caption>소모품 <span>숫자키 1–4</span><small className="preparation-caption">
      {run.consumablesBlocked ? '동결' : run.consumableUsedSinceShot ? '사용 완료' : '발사당 1개'}
    </small></caption><thead className="sr-only"><tr>
      <th>단축키</th><th>아이템</th><th>보유량</th><th>동작</th></tr></thead>
      <tbody>{BattleEngine.CONSUMABLE_CATALOG.map((item, index) => <tr key={item.id}>
        <td><kbd>{index + 1}</kbd></td><th scope="row"><AssetImage src={ASSETS.items[item.id]} /><span>{item.name}</span></th>
        <td>{run.inventory[item.id]}</td><td><button aria-label={`${item.name} 사용`}
          disabled={disabled || run.inventory[item.id] === 0 || run.consumablesBlocked || run.consumableUsedSinceShot}
          title={run.consumablesBlocked ? '얼음 숨결 · 이번 턴 사용 불가'
            : run.consumableUsedSinceShot ? '사탕을 발사하면 다시 사용할 수 있어요.' : item.description}
          onClick={() => onConsumable(item.id)}>사용</button></td>
      </tr>)}</tbody>
    </table>
    <p className="item-lockout" role="status" aria-live="polite">{run.consumablesBlocked ? '얼음 숨결 · 사탕을 발사해 해제'
      : run.consumableUsedSinceShot ? '사용 완료 · 사탕 발사 후 다시 사용' : '반격 없이 사용 · 발사 사이 1개'}</p>
  </div>;
}
