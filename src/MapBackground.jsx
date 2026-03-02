import * as XLSX from "xlsx";

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
const redPinIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
const yellowPinIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
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

// ===== Provinces (VN2000 TM-3 central meridian L0) - giống VS =====
const PROVINCES_L0 = {
  "Lai Châu": 103,
  "Điện Biên": 103,
  "Sơn La": 104,
  "Kiên Giang": 104.5,
  "Cà Mau": 104.5,
  "Lào Cai": 104.75,
  "Yên Bái": 104.75,
  "Nghệ An": 104.75,
  "Phú Thọ": 104.75,
  "An Giang": 104.75,
  "Thanh Hóa": 105,
  "Vĩnh Phúc": 105,
  "Hà Tây": 105,
  "Đồng Tháp": 105,
  "Cần Thơ": 105,
  "Hậu Giang": 105,
  "Bạc Liêu": 105,
  "Hà Nội": 105,
  "Ninh Bình": 105,
  "Hà Nam": 105,
  "Hà Giang": 105.5,
  "Hải Dương": 105.5,
  "Hà Tĩnh": 105.5,
  "Bắc Ninh": 105.5,
  "Hưng Yên": 105.5,
  "Thái Bình": 105.5,
  "Nam Định": 105.5,
  "Tây Ninh": 105.5,
  "Vĩnh Long": 105.5,
  "Sóc Trăng": 105.5,
  "Trà Vinh": 105.5,
  "Cao Bằng": 105.75,
  "Long An": 105.75,
  "Tiền Giang": 105.75,
  "Bến Tre": 105.75,
  "Hải Phòng": 105.75,
  "Hồ Chí Minh": 105.75,
  "Bình Dương": 105.75,
  "Tuyên Quang": 106,
  "Hòa Bình": 106,
  "Quảng Bình": 106,
  "Quảng Trị": 106.25,
  "Bình Phước": 106.25,
  "Bắc Kạn": 106.5,
  "Thái Nguyên": 106.5,
  "Bắc Giang": 107,
  "Thừa Thiên Huế": 107,
  "Lạng Sơn": 107.25,
  "Kon Tum": 107.5,
  "Quảng Ninh": 107.75,
  "Đồng Nai": 107.75,
  "Bà Rịa Vũng Tàu": 107.75,
  "Quảng Nam": 107.75,
  "Lâm Đồng": 107.75,
  "Đà Nẵng": 107.75,
  "Quảng Ngãi": 108,
  "Ninh Thuận": 108.25,
  "Khánh Hòa": 108.25,
  "Bình Định": 108.25,
  "Đắc Lắc": 108.5,
  "Đắc Nông": 108.5,
  "Phú Yên": 108.5,
  "Gia Lai": 108.5,
  "Bình Thuận": 108.5,
};

function wgs84ToVn2000TM3(latitude, longitude, L0_deg) {
  const a = 6378137.0;
  const invF = 298.25722356;
  const f = 1.0 / invF;
  const e2 = 2 * f - f * f;
  const ep2 = e2 / (1 - e2);

  const lat = (latitude * Math.PI) / 180.0;
  const lon = (longitude * Math.PI) / 180.0;

  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const sinLon = Math.sin(lon);
  const cosLon = Math.cos(lon);

  const Nw = a / Math.sqrt(1 - e2 * sinLat * sinLat);

  const Xw = Nw * cosLat * cosLon;
  const Yw = Nw * cosLat * sinLon;
  const Zw = Nw * (1 - e2) * sinLat;

  const Tx = -191.90441429;
  const Ty = -39.30318279;
  const Tz = -111.45032835;

  const Rx_sec = -0.00928836;
  const Ry_sec = 0.01975479;
  const Rz_sec = -0.00427372;

  const rx = (Rx_sec * Math.PI) / (180.0 * 3600.0);
  const ry = (Ry_sec * Math.PI) / (180.0 * 3600.0);
  const rz = (Rz_sec * Math.PI) / (180.0 * 3600.0);

  const ds = 0.252906278e-6;
  const k = 1.0 + ds;

  const dX = Xw - Tx;
  const dY = Yw - Ty;
  const dZ = Zw - Tz;

  const Xv = (1.0 / k) * (dX + rz * dY - ry * dZ);
  const Yv = (1.0 / k) * (-rz * dX + dY + rx * dZ);
  const Zv = (1.0 / k) * (ry * dX - rx * dY + dZ);

  const lonVn = Math.atan2(Yv, Xv);
  const p = Math.sqrt(Xv * Xv + Yv * Yv);

  let latVn = Math.atan2(Zv, p * (1 - e2));
  for (let i = 0; i < 10; i++) {
    const s = Math.sin(latVn);
    const Niter = a / Math.sqrt(1 - e2 * s * s);
    latVn = Math.atan2(Zv + e2 * Niter * s, p);
  }

  const L0 = (L0_deg * Math.PI) / 180.0;
  const k0 = 0.9999;
  const FE = 500000.0;
  const FN = 0.0;

  const sinB = Math.sin(latVn);
  const cosB = Math.cos(latVn);
  const tanB = Math.tan(latVn);

  const Nphi = a / Math.sqrt(1 - e2 * sinB * sinB);
  const T = tanB * tanB;
  const C = ep2 * cosB * cosB;
  const A = (lonVn - L0) * cosB;

  const e4 = e2 * e2;
  const e6 = e4 * e2;

  const M =
    a *
    ((1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * latVn -
      ((3 * e2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * latVn) +
      ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * latVn) -
      (35 * e6) / 3072 * Math.sin(6 * latVn));

  const X =
    FN +
    k0 *
      (M +
        Nphi *
          tanB *
          (A * A / 2 +
            ((5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4)) / 24 +
            ((61 - 58 * T + T * T + 600 * C - 330 * ep2) * Math.pow(A, 6)) /
              720));

  const Y =
    FE +
    k0 *
      (Nphi *
        (A +
          ((1 - T + C) * Math.pow(A, 3)) / 6 +
          ((5 - 18 * T + T * T + 72 * C - 58 * ep2) * Math.pow(A, 5)) / 120));

  return { X, Y }; // X=Northing, Y=Easting
}

function vn2000TM3ToWgs84(E, N, L0_deg) {
  // E = Easting (Y), N = Northing (X)
  // L0_deg: kinh tuyến trục theo tỉnh (giống PROVINCES_L0)

  const a = 6378137.0;
  const invF = 298.25722356;
  const f = 1.0 / invF;
  const e2 = 2 * f - f * f;
  const ep2 = e2 / (1 - e2);

  const k0 = 0.9999;
  const FE = 500000.0;
  const FN = 0.0;

  const L0 = (L0_deg * Math.PI) / 180.0;

  // ===== 1) Inverse TM-3: (E,N) -> (phi, lam) trên datum VN2000 =====
  const M = (N - FN) / k0;

  const n = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const mu =
    M /
    (a * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256));

  const phi1 =
    mu +
    (3 * n) / 2 * Math.sin(2 * mu) -
    (27 * Math.pow(n, 3)) / 32 * Math.sin(2 * mu) +
    ((21 * Math.pow(n, 2)) / 16 - (55 * Math.pow(n, 4)) / 32) *
      Math.sin(4 * mu) +
    (151 * Math.pow(n, 3)) / 96 * Math.sin(6 * mu) +
    (1097 * Math.pow(n, 4)) / 512 * Math.sin(8 * mu);

  const sin1 = Math.sin(phi1);
  const cos1 = Math.cos(phi1);
  const tan1 = Math.tan(phi1);

  const N1 = a / Math.sqrt(1 - e2 * sin1 * sin1);
  const R1 = (a * (1 - e2)) / Math.pow(1 - e2 * sin1 * sin1, 1.5);
  const T1 = tan1 * tan1;
  const C1 = ep2 * cos1 * cos1;

  const D = (E - FE) / (k0 * N1);

  const phi =
    phi1 -
    (N1 * tan1) /
      R1 *
      (D * D / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * Math.pow(D, 4)) /
          24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) *
          Math.pow(D, 6)) /
          720);

  const lam =
    L0 +
    (D -
      ((1 + 2 * T1 + C1) * Math.pow(D, 3)) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) *
        Math.pow(D, 5)) /
        120) /
      cos1;

  // ===== 2) (phi,lam) -> ECEF VN2000 =====
  const H = 0.0;

  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const sinLam = Math.sin(lam);
  const cosLam = Math.cos(lam);

  const Nphi = a / Math.sqrt(1 - e2 * sinPhi * sinPhi);

  const Xv = (Nphi + H) * cosPhi * cosLam;
  const Yv = (Nphi + H) * cosPhi * sinLam;
  const Zv = (Nphi * (1 - e2) + H) * sinPhi;

  // ===== 3) Bursa-Wolf VN2000 -> WGS84 (forward) =====
  const Tx = -191.90441429;
  const Ty = -39.30318279;
  const Tz = -111.45032835;

  const Rx_sec = -0.00928836;
  const Ry_sec = 0.01975479;
  const Rz_sec = -0.00427372;

  const rx = (Rx_sec * Math.PI) / (180.0 * 3600.0);
  const ry = (Ry_sec * Math.PI) / (180.0 * 3600.0);
  const rz = (Rz_sec * Math.PI) / (180.0 * 3600.0);

  const ds = 0.252906278e-6;
  const k = 1.0 + ds;

  const Xw = Tx + k * (Xv - rz * Yv + ry * Zv);
  const Yw = Ty + k * (rz * Xv + Yv - rx * Zv);
  const Zw = Tz + k * (-ry * Xv + rx * Yv + Zv);

  // ===== 4) ECEF WGS84 -> (lat,lon) =====
  const lon = Math.atan2(Yw, Xw);
  const p = Math.sqrt(Xw * Xw + Yw * Yw);

  let lat = Math.atan2(Zw, p * (1 - e2));
  for (let i = 0; i < 10; i++) {
    const s = Math.sin(lat);
    const Nw = a / Math.sqrt(1 - e2 * s * s);
    lat = Math.atan2(Zw + e2 * Nw * s, p);
  }

  let latDeg = (lat * 180.0) / Math.PI;
  let lonDeg = (lon * 180.0) / Math.PI;
  if (lonDeg < -180) lonDeg += 360;
  if (lonDeg > 180) lonDeg -= 360;

  return { lat: latDeg, lng: lonDeg };
}

const PROVINCE_NAMES = Object.keys(PROVINCES_L0).sort((a, b) =>
  a.localeCompare(b, "vi")
);

function MyLocationIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="12"
        cy="12"
        r="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
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

// ✅ LUÔN m (2 số lẻ)
const fmtLen = (m) => `${m.toFixed(2)} m`;

// ✅ LUÔN m² (2 số lẻ)
const fmtArea = (m2) => `${m2.toFixed(2)} m²`;

const isPolygon = (layer) => layer instanceof L.Polygon;
const isPolylineOnly = (layer) =>
  layer instanceof L.Polyline && !(layer instanceof L.Polygon);

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

/**
 * ✅ VN2000 distance (m): đổi 2 điểm WGS84 -> VN2000 TM-3 -> Euclid
 * X = Northing (m), Y = Easting (m)
 */
function vn2000DistanceM(aLatLng, bLatLng, L0_deg) {
  if (!L0_deg) return 0;
  const p1 = wgs84ToVn2000TM3(aLatLng.lat, aLatLng.lng, L0_deg);
  const p2 = wgs84ToVn2000TM3(bLatLng.lat, bLatLng.lng, L0_deg);
  const dX = p2.X - p1.X; // Northing diff
  const dY = p2.Y - p1.Y; // Easting diff
  return Math.sqrt(dX * dX + dY * dY);
}

/**
 * ✅ Diện tích chuẩn trắc địa/địa chính (Gauss / Shoelace) trên tọa độ phẳng VN2000 (m²)
 * - Đổi từng đỉnh WGS84 -> VN2000 (E,N)
 * - Áp dụng công thức Gauss (shoelace)
 */
function polygonAreaM2_VN2000(latlngs, L0_deg) {
  if (!L0_deg) return 0;
  const ring = flattenLatLngs(latlngs);
  if (!ring || ring.length < 3) return 0;

  // tạo list điểm phẳng (x=Easting, y=Northing)
  const pts = ring.map((p) => {
    const vn = wgs84ToVn2000TM3(p.lat, p.lng, L0_deg);
    return { x: vn.Y, y: vn.X };
  });

  // đóng vòng nếu chưa đóng
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (first.x !== last.x || first.y !== last.y) pts.push({ ...first });

  let sum = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    sum += pts[i].x * pts[i + 1].y - pts[i + 1].x * pts[i].y;
  }
  return Math.abs(sum) / 2;
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

/**
 * ✅ Update label từng đoạn/cạnh theo VN2000
 */
function updateSegmentLabels(map, layer, L0_deg) {
  if (!map || !layer) return;

  clearSegLabels(layer);

  const latlngs = layer.getLatLngs();
  const pts = flattenLatLngs(latlngs);
  if (!pts || pts.length < 2) return;

  // polyline: từng đoạn i-1 -> i
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const d = vn2000DistanceM(a, b, L0_deg);
    addSegLabel(map, layer, segmentMid(a, b), fmtLen(d));
  }

  // polygon: thêm cạnh cuối nối về đầu
  if (layer instanceof L.Polygon && pts.length >= 3) {
    const a = pts[pts.length - 1];
    const b = pts[0];
    const d = vn2000DistanceM(a, b, L0_deg);
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

/**
 * ✅ Update label tổng / diện tích theo VN2000
 */
function updateMeasureLabel(map, layer, L0_deg) {
  if (!map || !layer) return;

  // polyline: hiện từng đoạn + tổng
  if (isPolylineOnly(layer)) {
    const pts = flattenLatLngs(layer.getLatLngs());
    if (!pts || pts.length < 2) return;

    // (1) từng đoạn
    updateSegmentLabels(map, layer, L0_deg);

    // (2) tổng chiều dài (VN2000)
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      total += vn2000DistanceM(pts[i - 1], pts[i], L0_deg);
    }

    // (3) label tổng ở điểm cuối
    const lastPoint = pts[pts.length - 1];

    layer.unbindTooltip();
    layer
      .bindTooltip(`Tổng = ${fmtLen(total)}`, {
        permanent: true,
        direction: "top",
        className: "pm-measure-label",
        opacity: 1,
        interactive: false,
        offset: [0, -12],
      })
      .openTooltip(lastPoint);

    return;
  }

  // polygon: diện tích ở giữa + từng cạnh
  if (isPolygon(layer)) {
    const latlngs = layer.getLatLngs();

    // (1) vị trí đặt label (centroid) - chỉ để đặt text ở giữa
    const center = centroidOfPolygon(latlngs);

    // (2) diện tích chuẩn địa chính (VN2000 + Gauss)
    const area = polygonAreaM2_VN2000(latlngs, L0_deg);
    bindPermanentLabel(layer, fmtArea(area), center);

    // (3) label từng cạnh (VN2000)
    updateSegmentLabels(map, layer, L0_deg);

    return;
  }
}

export default function MapBackground({ user, approved, onRequireAuth, uiLocked, isForcedCompact }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);

  const [isLocating, setIsLocating] = useState(false);

  const [provinceForConvert, setProvinceForConvert] = useState(
    PROVINCE_NAMES[0] || "An Giang"
  );

  const measureL0 = useMemo(() => {
    return PROVINCES_L0[provinceForConvert] || null;
  }, [provinceForConvert]);

  // ===== THÊM ĐIỂM THEO TỌA ĐỘ =====
  const [showCoordModal, setShowCoordModal] = useState(false);
  const [provinceForAddPoint, setProvinceForAddPoint] = useState(
    PROVINCE_NAMES[0] || "An Giang"
  );

  const [coordMode, setCoordMode] = useState("latlng"); // latlng | vn2000

  const [latInput, setLatInput] = useState("");
  const [lngInput, setLngInput] = useState("");

  const [xInput, setXInput] = useState("");
  const [yInput, setYInput] = useState("");

  const baseLayerRef = useRef(null);
  const qhLayerRef = useRef(null); // ✅ tile layer quy hoạch

  const drawnLayersRef = useRef([]); // ✅ lưu tất cả line/polyline/polygon đã vẽ

  const exportPointsToExcel = () => {
    const L0 = PROVINCES_L0[provinceForConvert];
    if (!L0) {
      alert("Bạn chưa chọn tỉnh hợp lệ để đổi VN2000.");
      return;
    }

    const layers = drawnLayersRef.current || [];
    if (!layers.length) {
      alert("Chưa có đối tượng nào được vẽ để xuất.");
      return;
    }

    const flatten = (latlngs) => {
      if (!Array.isArray(latlngs)) return [];
      if (!Array.isArray(latlngs[0])) return latlngs; // polyline
      if (!Array.isArray(latlngs[0][0])) return latlngs[0]; // polygon ring
      return latlngs[0][0];
    };

    const rows = [];
    let stt = 1;

    for (const layer of layers) {
      if (!layer?.getLatLngs) continue;

      let pts = flatten(layer.getLatLngs());

      // bỏ điểm cuối nếu polygon đóng vòng
      if (pts.length >= 2) {
        const a = pts[0];
        const b = pts[pts.length - 1];
        if (a?.lat === b?.lat && a?.lng === b?.lng) pts = pts.slice(0, -1);
      }

      for (const p of pts) {
        const lat = p.lat;
        const lon = p.lng;

        const vn = wgs84ToVn2000TM3(lat, lon, L0);

        rows.push([
          stt++,
          Number(lat.toFixed(12)),
          Number(lon.toFixed(12)),
          Number(vn.X.toFixed(6)),
          Number(vn.Y.toFixed(6)),
        ]);
      }
    }

    const header = ["STT", "Lat", "Long", "X", "Y"];
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Points");

    const pad2 = (n) => String(n).padStart(2, "0");
    const now = new Date();
    const fileName =
      `XuatDiem_${provinceForConvert.replaceAll(" ", "_")}_` +
      `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}_` +
      `${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(
        now.getSeconds()
      )}.xlsx`;

    XLSX.writeFile(wb, fileName);

    alert(
      `✅ Đã xuất Excel: ${fileName}\n` +
        `📌 File được tải về Downloads của trình duyệt (hoặc nơi bạn chọn lưu).`
    );
  };

  const markerRef = useRef(null);
  const warnedAccRef = useRef(false);
  const didCenterRef = useRef(false); // ✅ chỉ center 1 lần mỗi lần bật vị trí
  const isLocatingRef = useRef(false);
  const onFoundRef = useRef(null);
  const onErrorRef = useRef(null);

  const targetMarkerRef = useRef(null); // ✅ pin đỏ đánh dấu
  const addedMarkersRef = useRef([]); // ✅ lưu tất cả điểm bạn thêm bằng nút 📍

  useEffect(() => {
    isLocatingRef.current = isLocating;
  }, [isLocating]);

  // ✅ chỉ cho phép fitBounds khi đổi tỉnh
  const shouldFitOnNextOverlayRef = useRef(true);

  const [mapType, setMapType] = useState("sat");
  const [overlayEnabled, setOverlayEnabled] = useState(false);
  const [opacity, setOpacity] = useState(0.85);

  const [provinceCode, setProvinceCode] = useState(
    CATALOG[0]?.provinceCode ?? "91"
  );
  const [areaKey, setAreaKey] = useState(
    CATALOG[0]?.areas?.[0]?.key ?? "thoai-son"
  );

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

    const dv = selectedProvince?.defaultView ?? {
      lat: 10.8231,
      lng: 106.6297,
      zoom: 12,
    };
    map.setView([dv.lat, dv.lng], dv.zoom);

    layers.sat.addTo(map);
    baseLayerRef.current = layers.sat;

    mapRef.current = map;
    map.doubleClickZoom.disable(); // ✅ tắt zoom khi double click

    // ✅ Long-press để thả pin đỏ (mobile), click phải (desktop)
    let pressTimer = null;
    let pressLatLng = null;

    const placeTargetMarker = (latlng) => {
      if (targetMarkerRef.current) {
        targetMarkerRef.current.setLatLng(latlng);
      } else {
        targetMarkerRef.current = L.marker(latlng, { icon: redPinIcon }).addTo(
          map
        );
        targetMarkerRef.current.on("click", () => {
          map.removeLayer(targetMarkerRef.current);
          targetMarkerRef.current = null;
        });
      }
    };

    // Desktop: click phải / giữ chuột -> context menu
    map.on("contextmenu", (e) => {
      placeTargetMarker(e.latlng);
    });

    // Mobile: nhấn đè ~450ms
    map.on("mousedown touchstart", (e) => {
      pressLatLng = e.latlng || (e.latlng === undefined ? null : e.latlng);

      pressTimer = setTimeout(() => {
        if (pressLatLng) placeTargetMarker(pressLatLng);
      }, 450);
    });

    map.on("mouseup touchend touchcancel move", () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    });

    // ✅ Bật công cụ đo (Geoman)
    import("@geoman-io/leaflet-geoman-free").then(() => {
      if (!map.pm) {
        console.error("Geoman chưa load được!");
        return;
      }

      const isMobile = window.matchMedia("(max-width: 640px)").matches;

      map.pm.addControls({
        position: "topright",
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

      const forcePmPosition = () => {
        const tb = document.querySelector(".leaflet-pm-toolbar");
        if (!tb) return;

        if (isForcedCompact) {
          tb.style.top = "3%";
          tb.style.bottom = "auto";
          tb.style.transform = "translateY(-3%)";
          tb.style.marginTop = "0";
        } else {
          tb.style.top = "5%";
          tb.style.bottom = "auto";
          tb.style.transform = "translateY(-10%)";
          tb.style.marginTop = "0";
        }
      };

      setTimeout(forcePmPosition, 100);
      window.addEventListener("resize", forcePmPosition);

      // ✅ tắt đo mặc định của Geoman để không ra km/ha
      map.pm.setGlobalOptions({
        measurements: false,
        showMeasurements: false,
        tooltips: false,

        // ✅ đường nối tới chuột (hint)
        hintlineStyle: {
          color: "#eb0c2d",
          weight: 1.5,
          opacity: 1,
          dashArray: "3,6",
        },
      });

      // ✅ Style cho nét vẽ (mỏng lại)
      map.pm.setPathOptions({
        color: "#f30b0b",
        weight: 1.5,
        opacity: 1,
        fillColor: "#1e40af",
        fillOpacity: 0.08,
      });

      // ✅ live khi đang vẽ
      map.on("pm:drawstart", (e) => {
        const layer = e.workingLayer;
        if (!layer) return;

        if (layer.setStyle) {
          layer.setStyle({
            color: "#d3e910",
            weight: 1.5,
            opacity: 1,
            fillColor: "#1e40af",
            fillOpacity: 0.08,
          });
        }

        const refresh = () => updateMeasureLabel(map, layer, measureL0);
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

        drawnLayersRef.current.push(layer); // ✅ lưu để export tất cả

       updateMeasureLabel(map, layer, measureL0);

        layer.on("pm:edit", () => updateMeasureLabel(map, layer, measureL0));
        layer.on("pm:update", () => updateMeasureLabel(map, layer, measureL0));
        layer.on("pm:dragend", () => updateMeasureLabel(map, layer, measureL0));
      });

      // ✅ Khi xóa bằng removalMode -> dọn tooltip + segment labels
      map.on("pm:remove", (e) => {
        const layer = e.layer;
        if (!layer) return;
        drawnLayersRef.current = drawnLayersRef.current.filter((l) => l !== layer);

        clearSegLabels(layer);

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
  }, [layers, selectedProvince, isForcedCompact]);

  // change basemap
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const nextLayer =
      mapType === "osm" ? layers.osm : mapType === "sat" ? layers.sat : layers.hot;

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
  }, [selectedArea, provinceCode, areaKey, overlayEnabled, opacity]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // refresh tất cả đối tượng đã vẽ theo L0 mới
    for (const layer of drawnLayersRef.current || []) {
      try {
        updateMeasureLabel(map, layer, measureL0);
      } catch {}
    }
  }, [measureL0]);

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

  useEffect(() => {
    if (!user) setOverlayEnabled(false);
  }, [user]);

  const cycleMapType = () =>
    setMapType((t) => (t === "osm" ? "sat" : t === "sat" ? "hot" : "osm"));

  const ACC_WARN_M = 50;

  // nhắc người dùng bật "vị trí chính xác" cho Chrome
  const showPreciseLocationHint = () => {
    alert(
      "Vị trí đang sai số lớn (>50m).\n\n" +
        "Cách khắc phục trên Android:\n" +
        "1) Cài đặt → Ứng dụng → Chrome → Quyền → Vị trí\n" +
        "2) Chọn 'Chỉ cho phép khi dùng ứng dụng'\n" +
        "3) Bật 'Vị trí chính xác'\n\n" +
        "Sau đó mở lại trang và bấm 'Vị trí của tôi'."
    );
  };

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
    warnedAccRef.current = false;
    didCenterRef.current = false;
  };

  const locateMe = () => {
    const map = mapRef.current;
    if (!map) return;

    // ✅ Nếu đang bật → tắt (dùng ref để không bị trễ state)
    if (isLocatingRef.current) {
      stopLocating();
      warnedAccRef.current = false;
      return;
    }

    // ✅ Bật
    setIsLocating(true);
    warnedAccRef.current = false;

    const onFound = (e) => {
      const { latlng, accuracy } = e;

      if (!warnedAccRef.current && typeof accuracy === "number" && accuracy > ACC_WARN_M) {
        warnedAccRef.current = true;
        showPreciseLocationHint();
      }

      if (markerRef.current) {
        markerRef.current.setLatLng(latlng);
      } else {
        markerRef.current = L.marker(latlng, { icon: pinIcon }).addTo(map);
      }

      if (!didCenterRef.current) {
        didCenterRef.current = true;
        map.panTo(latlng, { animate: true });
      }
    };

    const onError = () => {
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

  const addPointToMap = (lat, lng) => {
    const map = mapRef.current;
    if (!map) return;

    const mk = L.marker([lat, lng], {
      icon: yellowPinIcon,
      bubblingMouseEvents: false,
    }).addTo(map);

    // ✅ dblclick mới xóa
    mk.on("dblclick", (e) => {
      L.DomEvent.stop(e);
      map.removeLayer(mk);
      addedMarkersRef.current = addedMarkersRef.current.filter((m) => m !== mk);
    });

    addedMarkersRef.current.push(mk);

    map.setView([lat, lng], 18);
  };

  const handleAddPoint = () => {
    try {
      if (coordMode === "latlng") {
        const lat = parseFloat(latInput);
        const lng = parseFloat(lngInput);

        if (isNaN(lat) || isNaN(lng)) {
          alert("Lat/Long không hợp lệ");
          return;
        }

        addPointToMap(lat, lng);
      }

      if (coordMode === "vn2000") {
        const X = parseFloat(xInput); // Northing
        const Y = parseFloat(yInput); // Easting

        if (isNaN(X) || isNaN(Y)) {
          alert("X/Y không hợp lệ");
          return;
        }

        const L0 = PROVINCES_L0[provinceForAddPoint];
        if (!L0) {
          alert("Bạn chưa chọn tỉnh hợp lệ để đổi VN2000.");
          return;
        }

        // E=Y, N=X
        const wgs = vn2000TM3ToWgs84(Y, X, L0);

        addPointToMap(wgs.lat, wgs.lng);
      }

      setShowCoordModal(false);
    } catch (err) {
      alert("Lỗi chuyển tọa độ");
    }
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
          {mapType === "osm" ? "Phố" : mapType === "sat" ? "Vệ tinh" : "Map"}
        </div>

        <button
          className={`map-btn ${isLocating ? "active" : ""}`}
          title="Vị trí của tôi"
          onClick={locateMe}
        >
          <MyLocationIcon size={20} />
        </button>

        <button
          className="map-btn"
          title="Nhập điểm vào Map"
          onClick={() => setShowCoordModal(true)}
        >
          📍
        </button>
      </div>

      <div className="map-panel">
        <div className="row">
          <label className="label">Tỉnh</label>
          <select
            className="select"
            value={provinceCode}
            onChange={(e) => onChangeProvince(e.target.value)}
          >
            {CATALOG.map((p) => (
              <option key={p.provinceCode} value={p.provinceCode}>
                {p.provinceName}
              </option>
            ))}
          </select>
        </div>

        <div className="row">
          <label className="label">Khu vực</label>
          <select
            className="select"
            value={areaKey}
            onChange={(e) => setAreaKey(e.target.value)}
          >
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

        <div className="row">
          <label className="label">Xuất - Vẽ chọn đúng Tỉnh cũ</label>
          <select
            className="select"
            value={provinceForConvert}
            onChange={(e) => setProvinceForConvert(e.target.value)}
          >
            {PROVINCE_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="row">
          <button className="export-btn" onClick={exportPointsToExcel}>
            Xuất điểm (Excel)
          </button>
        </div>
      </div>

      {showCoordModal && (
        <div className="coord-modal">
          <div className="coord-box">
            <h4>Thêm điểm</h4>

            <select value={coordMode} onChange={(e) => setCoordMode(e.target.value)}>
              <option value="latlng">Lat / Long</option>
              <option value="vn2000">VN2000 (X,Y)</option>
            </select>

            <div style={{ marginTop: 10 }}>
              <select
                value={provinceForAddPoint}
                onChange={(e) => setProvinceForAddPoint(e.target.value)}
                style={{ width: "100%", padding: 6 }}
                disabled={coordMode !== "vn2000"}
              >
                {PROVINCE_NAMES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {coordMode === "latlng" && (
              <>
                <input
                  placeholder="Latitude"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                />
                <input
                  placeholder="Longitude"
                  value={lngInput}
                  onChange={(e) => setLngInput(e.target.value)}
                />
              </>
            )}

            {coordMode === "vn2000" && (
              <>
                <input
                  placeholder="X (Northing)"
                  value={xInput}
                  onChange={(e) => setXInput(e.target.value)}
                />
                <input
                  placeholder="Y (Easting)"
                  value={yInput}
                  onChange={(e) => setYInput(e.target.value)}
                />
              </>
            )}

            <button onClick={handleAddPoint}>Thêm</button>
            <button onClick={() => setShowCoordModal(false)}>Hủy</button>
          </div>
        </div>
      )}
    </div>
  );
}