# Soru Defteri - Proje Dokümantasyonu

## 📋 Proje Özeti

**Soru Defteri**, çözdüğünüz soruları kaydetmenizi, düzenlemenizi ve PDF olarak dışa aktarmanızı sağlayan bir web uygulamasıdır.

- ✅ Tek kullanıcılı (login yok)
- ✅ Yerel veritabanı
- ✅ PDF çıktısı (cevaplar son sayfada)

---

## 🛠️ Teknoloji Yığını

| Kategori | Teknoloji |
|----------|-----------|
| **Frontend Framework** | Next.js (App Router) |
| **Programlama Dili** | TypeScript |
| **UI Framework** | React |
| **Styling** | TailwindCSS |
| **Component Library** | Shadcn/UI |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth |
| **PDF** | jsPDF |

---

## 📊 Veritabanı Şeması (Supabase)

Tablolar Supabase üzerinden PostgreSQL ile yönetilmektedir. Temel tablolar:
- `User`: Kullanıcı profili ve kredi bilgileri.
- `Category`: Soru kategorileri.
- `Question`: Soru metinleri ve seçenekler.
- `QuestionGroup`: Çoklu soru grupları.

---

## 📁 CSV Dosya Formatı

Soruları toplu olarak içe aktarmak için aşağıdaki CSV formatını kullanın:

### CSV Başlıkları

```csv
category,question_text,option_a,option_b,option_c,option_d,correct_answer,solution
```

### Örnek CSV İçeriği

```csv
category,question_text,option_a,option_b,option_c,option_d,correct_answer,solution
Matematik,"2 + 2 kaçtır?",3,4,5,6,B
Fizik,"Işık hızı yaklaşık kaç km/s'dir?","300.000","150.000","450.000","600.000",A
Tarih,"İstanbul hangi yılda fethedildi?",1453,1461,1492,1520,A
Biyoloji,"DNA'nın açılımı nedir?","Deoksiribonükleik Asit","Ribonükleik Asit","Amino Asit","Nükleik Asit",A
```

### CSV Kuralları

| Alan | Zorunlu | Açıklama |
|------|---------|----------|
| `category` | ✅ | Sorunun ait olduğu kategori/konu |
| `question_text` | ✅ | Soru metni |
| `option_a` | ✅ | A şıkkı |
| `option_b` | ✅ | B şıkkı |
| `option_c` | ✅ | C şıkkı |
| `option_d` | ✅ | D şıkkı |
| `correct_answer` | ✅ | Doğru cevap (A, B, C veya D) |

### CSV Kullanım İpuçları

1. **Virgül içeren metinler** tırnak içine alınmalıdır: `"Bu, virgüllü metin"`
2. **Tırnak içeren metinler** çift tırnak ile escape edilmelidir: `"Bu ""tırnaklı"" metin"`
3. **UTF-8 encoding** kullanın (Türkçe karakterler için)
4. İlk satır **başlık satırı** olmalıdır

---

## 📄 PDF Çıktı Formatı

PDF dosyası şu şekilde oluşturulacak:

1. **Sayfa 1-N:** Sorular (her sayfada 3-5 soru)
   - Soru numarası
   - Soru metni
   - A, B, C, D şıkları

2. **Son Sayfa:** Cevap Anahtarı
   ```
   CEVAP ANAHTARI
   ─────────────────
   1. B    6. A    11. C
   2. A    7. D    12. B
   3. C    8. B    13. A
   4. D    9. C    14. D
   5. A    10. A   15. B
   ```

---

## ✨ Temel Özellikler

### 1. Soru Yönetimi
- [ ] Soru ekleme (tek tek)
- [ ] CSV ile toplu soru içe aktarma
- [ ] Soru düzenleme
- [ ] Soru silme
- [ ] Kategorilere göre filtreleme

### 2. PDF Çıktısı
- [ ] Tüm soruları PDF olarak dışa aktarma
- [ ] Kategoriye göre PDF oluşturma
- [ ] Cevap anahtarı son sayfada

### 3. Kullanıcı Arayüzü
- [ ] Modern ve kullanıcı dostu tasarım
- [ ] Responsive (mobil uyumlu)
- [ ] Karanlık/Aydınlık mod

---

## 📦 Kurulum

```bash
# Bağımlılıkları yükle
npm install

# .env dosyasını Supabase bilgileriyle doldurun

# Geliştirme sunucusunu başlat
npm run dev
```

---

## 🔜 Sonraki Adımlar

2. Ödeme entegrasyonu
3. Gelişmiş AI soru türetme senaryoları

---

## 📝 Notlar

- Bu döküman proje geliştikçe güncellenecektir
