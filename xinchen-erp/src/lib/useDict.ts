"use client";
import { useState, useEffect } from "react";

interface DictItem {
  dictKey: string;
  dictValue: string;
  id?: number;
}

/**
 * 从数据字典加载下拉选项
 * @param groupName 字典分组名
 * @param fallback 字典为空时的默认值
 */
export function useDict(groupName: string, fallback: DictItem[] = []) {
  const [items, setItems] = useState<DictItem[]>(fallback);

  useEffect(() => {
    fetch(`/api/dicts?groupName=${groupName}&pageSize=200`)
      .then((r) => r.json())
      .then((d) => {
        if (d.list?.length > 0) {
          setItems(d.list);
        }
      })
      .catch(() => {});
  }, [groupName]);

  return items;
}

/**
 * 获取单个值的中文名
 */
export function getDictLabel(items: DictItem[], key: string) {
  return items.find((i) => i.dictKey === key)?.dictValue || key;
}
