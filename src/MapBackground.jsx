import { supabase } from "./supabaseClient";

import "./MapBackground.css";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import * as turf from "@turf/turf";

import "@geoman-io/leaflet-geoman-free"; // ✅ thêm dòng này
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
const SUPABASE_PUBLIC_BASE =
  "https://nfocduuucvbcacpcivep.supabase.co/storage/v1/object/public/planning";

const pinIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// ✅ Danh mục tỉnh/khu vực (tile dạng Global Mapper: Z{z}/{y}/{x}.png)
const CATALOG = [
  {
    provinceCode: "91",
    provinceName: "An Giang (91)",
    areas: [
      {
        key: "thoai-son",
        label: "Thoại Sơn",
        tileRoot: "tiles/91/thoai-son",
        bounds: [
          [9.7956775828, 104.765625],
          [10.4878118821, 105.46875],
        ],
        maxZoom: 17,
      },
      {
        key: "long-xuyen",
        label: "Long Xuyên",
        tileRoot: "tiles/91/long-xuyen",
        bounds: [
          [9.7956775828, 104.765625],
          [10.4878118821, 106.171875],
        ],
        maxZoom: 17,
      },
      {
    key: "chau-thanh",
    label: "Châu Thành",
    tileRoot: "tiles/91/chau-thanh",
    bounds: [
      [9.7956775828, 104.765625],
      [11.1784018737, 105.46875],
    ],
    maxZoom: 17,
    },

    {
    key: "tri-ton",
    label: "Tri Tôn",
    tileRoot: "tiles/91/tri-ton",
    bounds: [
      [9.7956775828, 104.765625],
      [11.1784018737, 105.46875],
    ],
    maxZoom: 17,
    },

     {
    key: "hon-dat",
    label: "Hòn Đất",
    tileRoot: "tiles/91/hon-dat",
    bounds: [
      [9.7956775828, 104.0625],
      [10.4878118821, 105.46875],
    ],
    maxZoom: 17,
    },

    ],
    defaultView: { lat: 10.3, lng: 105.28, zoom: 12 },
  },
];

function MyLocationIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v4M12 18v4M2 12h4M18 12h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}

// ====== helpers đo đạc + label ======
// ✅ LUÔN m
// ====== helpers đo đạc + label ======

// ✅ LUÔN m (2 số lẻ)
const fmtLen = (m) => `${m.toFixed(2)} m`;

// ✅ LUÔN m² (2 số lẻ)
const fmtArea = (m2) => `${m2.toFixed(2)} m²`;

const isPolygon = (layer) => layer instanceof L.Polygon;
const isPolylineOnly = (layer) => layer instanceof L.Polyline && !(layer instanceof L.Polygon);

function flattenLatLngs(latlngs) {
  // polyline: [LatLng, LatLng...]
  // polygon: [[LatLng...]] hoặc [[[LatLng...]]]
  if (!Array.isArray(latlngs)) return [];
  if (!Array.isArray(latlngs[0])) return latlngs; // polyline
  if (!Array.isArray(latlngs[0][0])) return latlngs[0]; // polygon 1 ring
  return latlngs[0][0]; // multipolygon (lấy ring đầu)
}

function centroidOfPolygon(latlngs) {
  const ring = flattenLatLngs(latlngs);
  const coords = ring.map((p) => [p.lng, p.lat]);
  if (coords.length < 3) return null;

  // turf polygon cần đóng vòng
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) coords.push(first);

  const poly = turf.polygon([coords]);
  const c = turf.centroid(poly).geometry.coordinates; // [lng, lat]
  return L.latLng(c[1], c[0]);
}

function polygonAreaM2(latlngs) {
  const ring = flattenLatLngs(latlngs);
  const coords = ring.map((p) => [p.lng, p.lat]);
  if (coords.length < 3) return 0;

  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) coords.push(first);

  const poly = turf.polygon([coords]);
  return turf.area(poly);
}

// ===== SEGMENT LABELS (mỗi đoạn/cạnh) =====
function segmentMid(a, b) {
  return L.latLng((a.lat + b.lat) / 2, (a.lng + b.lng) / 2);
}

function ensureSegStore(layer) {
  if (!layer.__segLabels) layer.__segLabels = [];
  return layer.__segLabels;
}

export function clearSegLabels(layer) {
  const arr = layer?.__segLabels || [];
  arr.forEach((m) => {
    try {
      m.remove(); // ✅ chắc chắn remove khỏi map
    } catch {}
  });
  if (layer) layer.__segLabels = [];
}

function addSegLabel(map, layer, at, text) {
  // marker + divIcon để đứng giữa đoạn (không phụ thuộc tooltip geoman)
  const m = L.marker(at, {
    interactive: false,
    keyboard: false,
    icon: L.divIcon({
      className: "pm-seg-label",
      html: `<div class="pm-measure-label">${text}</div>`,
      iconSize: [0, 0],
    }),
  }).addTo(map);

  ensureSegStore(layer).push(m);
}

function updateSegmentLabels(map, layer) {
  if (!map || !layer) return;

  clearSegLabels(layer);

  const latlngs = layer.getLatLngs();
  const pts = flattenLatLngs(latlngs);
  if (!pts || pts.length < 2) return;

  // ✅ polyline: từng đoạn i-1 -> i
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const d = map.distance(a, b);
    addSegLabel(map, layer, segmentMid(a, b), fmtLen(d));
  }

  // ✅ polygon: thêm cạnh cuối nối về đầu
  if (layer instanceof L.Polygon && pts.length >= 3) {
    const a = pts[pts.length - 1];
    const b = pts[0];
    const d = map.distance(a, b);
    addSegLabel(map, layer, segmentMid(a, b), fmtLen(d));
  }
}

function bindPermanentLabel(layer, text, atLatLng) {
  layer.unbindTooltip();
  layer.bindTooltip(text, {
    permanent: true,
    direction: "center",
    className: "pm-measure-label",
    opacity: 1,
    interactive: false,
  });
  if (atLatLng) layer.openTooltip(atLatLng);
}

function updateMeasureLabel(map, layer) {
  if (!map || !layer) return;

  // ✅ polyline: chỉ hiện từng đoạn (segment)
  if (isPolylineOnly(layer)) {
    const pts = flattenLatLngs(layer.getLatLngs());
    if (pts.length < 2) return;

    // (1) label từng đoạn
    updateSegmentLabels(map, layer);

    // (2) nếu bạn muốn hiện thêm tổng ở giữa line thì mở comment:
    // const total = pts.reduce((sum, p, i) => i ? sum + map.distance(pts[i-1], p) : 0, 0);
    // bindPermanentLabel(layer, fmtLen(total), pts[Math.floor(pts.length / 2)]);

    return;
  }

  // ✅ polygon: diện tích ở giữa + từng cạnh
  if (isPolygon(layer)) {
    const latlngs = layer.getLatLngs();

    // (1) label diện tích ở giữa
    const center = centroidOfPolygon(latlngs);
    const area = polygonAreaM2(latlngs);
    bindPermanentLabel(layer, fmtArea(area), center);

    // (2) label từng cạnh
    updateSegmentLabels(map, layer);

    return;
  }
}

export default function MapBackground({ user, onRequireAuth, uiLocked }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
const [isLocating, setIsLocating] = useState(false);
  const baseLayerRef = useRef(null);
  const qhLayerRef = useRef(null); // ✅ tile layer quy hoạch
  const markerRef = useRef(null);

  const isLocatingRef = useRef(false);
const onFoundRef = useRef(null);
const onErrorRef = useRef(null);

useEffect(() => {
  isLocatingRef.current = isLocating;
}, [isLocating]);

  // ✅ chỉ cho phép fitBounds khi đổi tỉnh
  const shouldFitOnNextOverlayRef = useRef(true);

  const [mapType, setMapType] = useState("sat");
  const [overlayEnabled, setOverlayEnabled] = useState(false);
  const [opacity, setOpacity] = useState(0.85);

  const [provinceCode, setProvinceCode] = useState(CATALOG[0]?.provinceCode ?? "91");
  const [areaKey, setAreaKey] = useState(CATALOG[0]?.areas?.[0]?.key ?? "thoai-son");

  const [approved, setApproved] = useState(false);

  const selectedProvince = useMemo(
    () => CATALOG.find((p) => p.provinceCode === provinceCode),
    [provinceCode]
  );

  const selectedArea = useMemo(
    () => selectedProvince?.areas?.find((a) => a.key === areaKey),
    [selectedProvince, areaKey]
  );

  const layers = useMemo(() => {
    const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 22,
    });

    const hot = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      { maxZoom: 22, attribution: "© CARTO © OpenStreetMap" }
    );

    const sat = L.tileLayer("https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
      maxZoom: 22,
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      attribution: "© Google",
      updateWhenIdle: true,
      keepBuffer: 2,
    });

    return { osm, sat, hot };
  }, []);

  useEffect(() => {
  const map = mapRef.current;
  if (!map) return;

  if (uiLocked) {
    // khóa thao tác bản đồ
    map.dragging?.disable();
    map.scrollWheelZoom?.disable();
    map.doubleClickZoom?.disable();
    map.touchZoom?.disable();
    map.boxZoom?.disable();
    map.keyboard?.disable();

    // khóa các mode của Geoman (nếu có)
    if (map.pm) {
      map.pm.disableDraw?.();
      map.pm.disableGlobalEditMode?.();
      map.pm.disableGlobalDragMode?.();
      map.pm.disableGlobalRemovalMode?.();
    }
  } else {
    // mở lại thao tác
    map.dragging?.enable();
    map.scrollWheelZoom?.enable();
    map.doubleClickZoom?.enable();
    map.touchZoom?.enable();
    map.boxZoom?.enable();
    map.keyboard?.enable();
  }
}, [uiLocked]);
  
  // init map
  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map(mapEl.current, {
  zoomControl: false,
  attributionControl: false,
  preferCanvas: true,

  // ✅ thêm renderer tolerance để dễ click vào line
  renderer: L.canvas({ tolerance: 10 }), // thử 10 -> 15 nếu vẫn khó
});


    const dv = selectedProvince?.defaultView ?? { lat: 10.8231, lng: 106.6297, zoom: 12 };
    map.setView([dv.lat, dv.lng], dv.zoom);

    layers.sat.addTo(map);
    baseLayerRef.current = layers.sat;

    mapRef.current = map;

    // ✅ Bật công cụ đo (Geoman)
   // ✅ Import Geoman NGAY SAU khi tạo map
import("@geoman-io/leaflet-geoman-free").then(() => {
  if (!map.pm) {
    console.error("Geoman chưa load được!");
    return;
  }

  const isMobile = window.matchMedia("(max-width: 640px)").matches;

  map.pm.addControls({
    position: isMobile ? "topright" : "bottomright",
    drawMarker: false,
    drawCircleMarker: false,
    drawCircle: false,
    drawRectangle: false,
    drawText: false,
    drawPolyline: true,
    drawPolygon: true,
    editMode: true,
    dragMode: true,
    cutPolygon: false,
    removalMode: true,
  });

  // ✅ tắt đo mặc định của Geoman để không ra km/ha
  map.pm.setGlobalOptions({
    measurements: false,
    showMeasurements: false,
    
  });

  // ✅ live khi đang vẽ
  map.on("pm:drawstart", (e) => {
    const layer = e.workingLayer;
    if (!layer) return;

    const refresh = () => updateMeasureLabel(map, layer);

    refresh();
    layer.on("pm:vertexadded", refresh);

    const onMove = () => refresh();
    map.on("mousemove", onMove);

    map.once("pm:drawend", () => {
      map.off("mousemove", onMove);
    });
  });

  // ✅ sau khi tạo xong / edit / drag
  map.on("pm:create", (e) => {
    const layer = e.layer;
    updateMeasureLabel(map, layer);

    layer.on("pm:edit", () => updateMeasureLabel(map, layer));
    layer.on("pm:update", () => updateMeasureLabel(map, layer));
    layer.on("pm:dragend", () => updateMeasureLabel(map, layer));
  });

  // ✅ Khi xóa bằng removalMode -> dọn tooltip + segment labels
map.on("pm:remove", (e) => {
  const layer = e.layer;
  if (!layer) return;

  // xóa label cạnh
  clearSegLabels(layer);

  // xóa tooltip diện tích/tổng
  try {
    layer.unbindTooltip?.();
  } catch {}
});

// ✅ Phòng hờ: nếu layer bị remove bằng cách khác
map.on("layerremove", (e) => {
  const layer = e.layer;
  if (!layer) return;
  if (layer.__segLabels) clearSegLabels(layer);
});


  console.log("✅ Geoman loaded");
});



    const raf = requestAnimationFrame(() => map.invalidateSize());
    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      map.remove();
      mapRef.current = null;
      baseLayerRef.current = null;
      qhLayerRef.current = null;
      markerRef.current = null;
    };
  }, [layers, selectedProvince]);

  // change basemap
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const nextLayer = mapType === "osm" ? layers.osm : mapType === "sat" ? layers.sat : layers.hot;

    if (baseLayerRef.current && map.hasLayer(baseLayerRef.current)) {
      map.removeLayer(baseLayerRef.current);
    }
    nextLayer.addTo(map);
    baseLayerRef.current = nextLayer;

    // ✅ Đưa quy hoạch lên trên cùng
    if (qhLayerRef.current) qhLayerRef.current.bringToFront();
  }, [mapType, layers]);

  // ✅ tạo/làm mới tile layer quy hoạch khi đổi tỉnh/khu vực
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedArea) return;

    if (qhLayerRef.current) {
      map.removeLayer(qhLayerRef.current);
      qhLayerRef.current = null;
    }

    const url = `${SUPABASE_PUBLIC_BASE}/${selectedArea.tileRoot}/Z{z}/{y}/{x}.png`;

    const tileLayer = L.tileLayer(url, {
      maxNativeZoom: 17,
      maxZoom: 22,
      opacity,
      noWrap: true,
      crossOrigin: true,
    });

    qhLayerRef.current = tileLayer;

    if (overlayEnabled) tileLayer.addTo(map);

    // ✅ CHỈ zoom khi vừa đổi tỉnh
    if (shouldFitOnNextOverlayRef.current) {
      const b = L.latLngBounds(selectedArea.bounds);
      map.fitBounds(b, { padding: [20, 20] });
      shouldFitOnNextOverlayRef.current = false;
    }

    // ✅ đảm bảo label (nếu có) vẫn nổi trên tile
    map.eachLayer((lyr) => {
      if (lyr instanceof L.Path) {
        try {
          lyr.bringToFront?.();
        } catch {}
      }
    });

    console.log("✅ Planning template:", url);
  }, [selectedArea, provinceCode, areaKey]);

  // ✅ đổi opacity (không load lại)
  useEffect(() => {
    if (qhLayerRef.current) qhLayerRef.current.setOpacity(opacity);
  }, [opacity]);

  // ✅ bật/tắt layer (không load lại)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !qhLayerRef.current) return;

    if (overlayEnabled) qhLayerRef.current.addTo(map);
    else map.removeLayer(qhLayerRef.current);
  }, [overlayEnabled]);

  // thêm cái tài khoản
  useEffect(() => {
    const loadAccess = async () => {
      if (!user) {
        setApproved(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_access")
        .select("approved, expires_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.log("user_access error:", error);
        setApproved(false);
        return;
      }

      const okApproved = data?.approved === true;
      const okNotExpired =
        !data?.expires_at || new Date(data.expires_at) > new Date();

      setApproved(okApproved && okNotExpired);
    };

      loadAccess();
  }, [user]);

  useEffect(() => {
    if (!user) setOverlayEnabled(false);
  }, [user]);

  const cycleMapType = () => setMapType((t) => (t === "osm" ? "sat" : t === "sat" ? "hot" : "osm"));

    const stopLocating = () => {
  const map = mapRef.current;
  if (!map) return;

  // gỡ đúng handler đã gắn
  if (onFoundRef.current) map.off("locationfound", onFoundRef.current);
  if (onErrorRef.current) map.off("locationerror", onErrorRef.current);

  map.stopLocate();

  // ✅ Xóa marker vị trí khỏi map
  if (markerRef.current) {
    try {
      map.removeLayer(markerRef.current);
    } catch {}
    markerRef.current = null;
  }

  onFoundRef.current = null;
  onErrorRef.current = null;

  setIsLocating(false);
};

    const locateMe = () => {
          const map = mapRef.current;
          if (!map) return;

          // ✅ Nếu đang bật → tắt (dùng ref để không bị trễ state)
          if (isLocatingRef.current) {
            stopLocating();
            return;
          }

          // ✅ Bật
          setIsLocating(true);

          const onFound = (e) => {
            const { latlng } = e;

            if (markerRef.current) {
              markerRef.current.setLatLng(latlng);
            } else {
              markerRef.current = L.marker(latlng, { icon: pinIcon }).addTo(map);
            }

            map.flyTo(latlng, 20, { animate: true });
          };

          const onError = () => {
            // muốn im lặng thì bỏ alert
            // alert("Không lấy được vị trí.");
            stopLocating();
          };

          onFoundRef.current = onFound;
          onErrorRef.current = onError;

          map.on("locationfound", onFound);
          map.on("locationerror", onError);

          map.locate({
            watch: true,
            setView: false,
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
      };
  const onChangeProvince = (code) => {
    shouldFitOnNextOverlayRef.current = true;
    setProvinceCode(code);

    const p = CATALOG.find((x) => x.provinceCode === code);
    setAreaKey(p?.areas?.[0]?.key ?? "");

    const map = mapRef.current;
    if (map && p?.defaultView) {
      map.setView([p.defaultView.lat, p.defaultView.lng], p.defaultView.zoom);
    }
  };

  return (
    <div className="map-wrap">
      <div ref={mapEl} className="map-canvas" />

      <div className="map-toolbar">
        <button className="map-btn" title="Đổi loại bản đồ" onClick={cycleMapType}>
          {mapType === "osm" ? "🏙️" : mapType === "sat" ? "🌍" : "🗺️"}
        </button>

        {/* ✅ Badge nằm ngay dưới nút đổi map */}
        <div className="map-badge-inline">
          {mapType === "osm" ? "Đường phố" : mapType === "sat" ? "Vệ tinh" : "Map"}
        </div>

       <button
            className={`map-btn ${isLocating ? "active" : ""}`}
            title="Vị trí của tôi"
            onClick={locateMe}
          >
            <MyLocationIcon size={20} />
        </button>
      </div>

      <div className="map-panel">
        <div className="row">
          <label className="label">Tỉnh</label>
          <select className="select" value={provinceCode} onChange={(e) => onChangeProvince(e.target.value)}>
            {CATALOG.map((p) => (
              <option key={p.provinceCode} value={p.provinceCode}>
                {p.provinceName}
              </option>
            ))}
          </select>
        </div>

        <div className="row">
          <label className="label">Khu vực</label>
          <select className="select" value={areaKey} onChange={(e) => setAreaKey(e.target.value)}>
            {selectedProvince?.areas?.map((a) => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
          </select>
        </div>

        <div className="row">
          <label className="label">
            <input
              type="checkbox"
              checked={overlayEnabled}
              onChange={(e) => {
                if (!user) {
                  setOverlayEnabled(false);
                  onRequireAuth?.();
                  return;
                }
                if (!approved) {
                  alert("Tài khoản chưa được duyệt.");
                  setOverlayEnabled(false);
                  return;
                }
                setOverlayEnabled(e.target.checked);
              }}
              style={{ marginRight: 8 }}
            />
            Hiện quy hoạch
          </label>
        </div>

        <div className="row">
          <label className="label">Độ mờ</label>
          <input
            className="range"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            disabled={!overlayEnabled}
          />
          <div className="pct">{Math.round(opacity * 100)}%</div>
        </div>
      </div>

    </div>
  );
}
