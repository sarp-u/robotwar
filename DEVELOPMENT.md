# Robot War geliştirme notları

## Çalıştırma

Node 22 kullan:

```bash
nvm use
```

İki ayrı terminal aç. İlk terminalde Colyseus sunucusunu çalıştır:

```bash
npm --prefix server run dev
```

İkinci terminalde Phaser istemcisini çalıştır:

```bash
npm run dev-nolog
```

Bu komut varsayılan olarak yerel prototipi açar ve Colyseus bağlantısı kurmaz.
Multiplayer bağlantısını etkinleştirmek için sunucu çalışırken istemciyi şöyle başlat:

```bash
VITE_MULTIPLAYER_ENABLED=true npm run dev-nolog
```

Sunucu varsayılan olarak `http://localhost:2567`, istemci ise
`http://localhost:8080` adresinde çalışır. Farklı bir sunucu adresi için istemciyi
`VITE_COLYSEUS_URL` ortam değişkeniyle başlatabilirsin.

Sunucu bağlantısını hızlıca doğrulamak için sunucu açıkken:

```bash
npm run smoke:multiplayer
```

Multiplayer istemcisinde başlangıç düğmesine basınca yeni bir özel oda oluşturulur.
Sağ üstteki davet düğmesi `?roomId=...` içeren bağlantıyı kopyalar. Bu bağlantıyı
açıp başlangıç düğmesine basan en fazla yedi kişi aynı odaya katılır.
Multiplayer modu, aynı bilgisayardaki iki test penceresinden biri odağı kaybetse de
çizimin güncel kalması için Phaser döngüsünü sabit zamanlayıcıyla çalıştırır.

## Mevcut prototip

- WASD ile hareket
- Fareyle nişan alma
- Sol tıkla ateş
- Arcade Physics duvar çarpışmaları
- Can, hasar, skor ve yeniden doğma
- Veri tabanlı ilk robot build'i
- Colyseus `battle` odası ve sunucu otoriteli sabit tick
- Sunucuda doğrulanan hareket, enerji, fire-rate, mermi ve oyuncular arası hasar
- İstemciden yalnızca hareket/nişan/ateş input'u gönderilmesi
- Linkle aynı özel odaya katılan 2–8 oyuncunun ve sunucu mermilerinin çizilmesi
- Yerel oyuncuda client prediction/reconciliation, uzak oyuncularda interpolation

## Kod sınırları

- `config/`: oyun sabitleri
- `data/`: robot parçaları ve stat hesapları
- `entities/`: görsel/fiziksel oyun nesneleri
- `input/`: kullanıcı girdisini oyun mantığından ayıran katman
- `ui/`: HUD ve ekran arayüzleri
- `scenes/`: Phaser sahneleri ve akış yönetimi
- `shared/`: istemci ve sunucunun birlikte kullandığı saf oyun kuralları
- `server/`: Colyseus odaları ve sunucu otoriteli simülasyon

## Sonraki üç adım

1. `Garage` sahnesi ekleyip parça seçimini `RobotBuild` verisine bağla.
2. İkinci silah ve ikinci bacak tipi ekleyerek build'ler arasında gerçek bir seçim oluştur.
3. Ateş anını yerelde gösterip sunucu mermisi geldiğinde birleştiren projectile prediction ekle.

Multiplayer aşamasında istemci konum veya hasar sonucu göndermemeli. İstemci yalnızca input göndermeli; hareket, ateş hızı, çarpışma ve hasar sunucuda hesaplanmalı.
