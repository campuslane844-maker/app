import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { SvgXml } from "react-native-svg";

type Props = {
  uri: string;
  width: number;
  height: number;
};

export function RemoteSvg({ uri, width, height }: Props) {
  const [xml, setXml] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await fetch(uri);
        const text = await res.text();
        if (!mounted) return;
        setXml(text);
      } catch {
        if (!mounted) return;
        setXml(null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [uri]);

  if (!xml) {
    return (
      <View style={{ width, height, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <SvgXml xml={xml} width={width} height={height} />;
}
