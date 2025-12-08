import { DDRAGON_BASE } from "@/lib/constants";
import type { Champion, DDragonChampionRaw } from "@/lib/types";
import { useEffect, useState } from "react";

export const useLeagueData = () => {
  const [version, setVersion] = useState<string | null>(null);
  const [champions, setChampions] = useState<Champion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initData = async () => {
      try {
        const verRes = await fetch(`${DDRAGON_BASE}/api/versions.json`);
        const verData = await verRes.json();
        const latestVer = verData[0];
        setVersion(latestVer);

        const champRes = await fetch(
          `${DDRAGON_BASE}/cdn/${latestVer}/data/ja_JP/champion.json`
        );
        const champData = await champRes.json();

        const champList = Object.values(
          champData.data as Record<string, DDragonChampionRaw>
        )
          .map((c) => ({ id: c.id, name: c.name, title: c.title }))
          .sort((a, b) => a.name.localeCompare(b.name, "ja"));

        setChampions(champList);
      } catch (e) {
        console.error("LoLデータの取得に失敗しました", e);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  return { version, champions, loading };
};
