# Weekly Journal
### Tuần 1 — 31/03/2026

**Thành viên:** Nguyễn Triệu Gia Khánh - 2A202600225, Nguyễn Xuân Hải - 2A202600245,

#### Đã làm
- Thu thập và phân loại nguồn PDF đề thi THPT QG môn Tiếng Anh (đề minh họa, đề các năm) và bài tập ôn luyện; ghi chú nguồn công khai / nội bộ để dùng cho RAG sau này.
- Tìm hiểu cách làm bài giảng / slide / quiz phục vụ ôn thi: cấu trúc tiết, phân dạng đề, mức độ câu hỏi.
- Nghiên cứu RAG: tài liệu → chunking, embedding, vector store, truy vấn; rủi ro hallucination và nhu cầu trích dẫn nguồn.

#### Khó nhất tuần này
- Một số PDF scan chất lượng thấp — cần OCR và kiểm tra lại nội dung trước khi đưa vào pipeline.
- Cân nhắc bản quyền và phạm vi sử dụng tài liệu (chỉ nguồn được phép hoặc nội bộ nhóm).

#### AI tool đã dùng
| Tool | Dùng để làm gì | Kết quả |
|---|---|---|
| Cursor | Tóm tắt tài liệu RAG, gợi ý chiến lược chunk / embedding | Rút ngắn thời gian đọc lý thuyết |
| Claude Code | So khớp cấu trúc đề thi với ý tưởng bài giảng / quiz | Có khung nội dung rõ hơn cho tuần sau |

#### Học được
- RAG không chỉ là “nhét PDF vào DB”: chunk size, overlap và metadata ảnh hưởng trực tiếp độ chính xác khi trả lời.
- Bài giảng ôn thi nên bám phân dạng đề (đọc hiểu, ngữ pháp, từ vựng…) để khớp với đề THPT QG.

#### Nếu làm lại, sẽ làm khác
- Lập bảng nguồn PDF ngay từ đầu (link, năm, loại đề, ghi chú bản quyền) thay vì chỉ lưu file rời.
- Thử một pipeline OCR mẫu sớm trên 1–2 file scan để ước lượng công sức làm sạch text.

#### Kế hoạch tuần tới
- Hoàn thiện frontend tĩnh (landing + chat), tách CSS/JS module.
- Chuẩn bị nối backend / API và (sau đó) luồng upload hoặc ingest PDF cho RAG.

---

### Tuần 2 — 7/04/2026

**Thành viên:** Nguyễn Triệu Gia Khánh - 2A202600225, Nguyễn Xuân Hải - 2A202600245

#### Đã làm
- Hoàn thành frontend tĩnh Teachly trong `frontend/`: `main_hub.html` (landing/hub) và `chatbot_ui.html` (giao diện chat).
- Tách CSS theo ranh giới layout/sidebar/chat/experience/tokens; JS dạng ES modules trong `frontend/js/chatbot/` (session, guided flow, gọi API, view tách khỏi logic).

#### Khó nhất tuần này
- ES modules cần serve qua HTTP (không mở trực tiếp `file://`) — phải thống nhất cách chạy static server khi dev và khi demo.
- Chuẩn bị nối API thật: CORS, endpoint và format message cần khớp với backend.

#### AI tool đã dùng
| Tool | Dùng để làm gì | Kết quả |
|---|---|---|
| Cursor | Refactor tách file CSS/JS, gợi ý cấu trúc module | Code frontend gọn, dễ bảo trì hơn |

#### Học được
- Tách UI (HTML/CSS) và logic (session, API) giúp sau này thay endpoint hoặc thêm RAG mà không phải viết lại toàn bộ giao diện.

#### Nếu làm lại, sẽ làm khác
- Ghi `README` hoặc một dòng hướng dẫn chạy `npx serve frontend` (hoặc tương đương) ngay khi chuyển sang ESM.

#### Kế hoạch tuần tới
- Tích hợp backend và luồng RAG (ingest PDF đã chuẩn hóa, truy vấn có trích dẫn).
- Upload / quản lý tài liệu nếu phạm vi sprint cho phép.

---

### Tuần 3 — 14/04/2026

**Thành viên:** Nguyễn Triệu Gia Khánh - 2A202600225, Nguyễn Xuân Hải - 2A202600245

#### Đã làm
- Xây phần backend nền tảng cho Teachly: tổ chức API server, chuẩn hóa luồng gọi từ frontend sang backend để chuẩn bị cho quiz / flashcard / slide / full set.
- Thiết kế và triển khai guided flow trong giao diện chat: người dùng có thể chọn cách bắt đầu bằng nhập chủ đề trực tiếp hoặc đi qua các form cấu hình riêng cho từng loại nội dung.
- Hoàn thiện khung chức năng cho 4 card chính gồm `Tạo quiz`, `Tạo flashcard`, `Tạo slide`, `Tạo Full Set`, để cùng dùng chung một trải nghiệm điều hướng và trạng thái trong chat.
- Hoàn thiện thêm cấu trúc session / sidebar / quản lý đoạn chat để mỗi lần tạo nội dung mới đều có thể theo dõi như một luồng riêng.

#### Khó nhất tuần này
- Giữ cho frontend chat và backend nói chuyện với nhau theo cùng một định dạng dữ liệu, đặc biệt khi mỗi card có form và đầu ra khác nhau.
- Tránh để logic bị dồn quá nhiều vào một file khi tính năng bắt đầu tăng nhanh.

#### AI tool đã dùng
| Tool | Dùng để làm gì | Kết quả |
|---|---|---|
| Cursor | Gợi ý cách tách logic guided flow và session | Giảm việc sửa chồng chéo khi mở rộng thêm card |
| Claude Code | Soát lại luồng dữ liệu frontend ↔ backend | Giúp chuẩn hóa các bước gửi form và nhận kết quả |

#### Học được
- Với sản phẩm dạng chatbot nhiều nhánh, việc chuẩn hóa state và flow quan trọng không kém phần sinh nội dung.
- Nếu khung 4 card được làm chung từ sớm thì sau này thêm API hoặc đổi chiến lược generate sẽ đỡ phải sửa giao diện nhiều nơi.

#### Nếu làm lại, sẽ làm khác
- Viết sơ đồ luồng guided flow ngay từ đầu để tránh mất thời gian đổi tên bước / dữ liệu trung gian.
- Tạo sớm contract cho payload giữa frontend và backend để việc ghép 4 card nhất quán hơn.

#### Kế hoạch tuần tới
- Đẩy mạnh trải nghiệm thật cho từng card, đặc biệt là quiz / flashcard / slide.
- Bắt đầu làm bản mobile-friendly để giao diện chat dùng ổn trên điện thoại.

---

### Tuần 4 — 21/04/2026

**Thành viên:** Nguyễn Triệu Gia Khánh - 2A202600225, Nguyễn Xuân Hải - 2A202600245

#### Đã làm
- Xây gần như hoàn chỉnh phần trải nghiệm web cho người dùng cuối: giao diện chat thực tế hơn, các thẻ chức năng rõ ràng hơn, bố cục trang chủ và khu vực experience được đồng bộ.
- Hoàn thiện các màn hình đầu ra cho quiz, flashcard và slide để người dùng không chỉ nhập form mà còn xem, tương tác và đi tiếp trong cùng một đoạn chat.
- Chỉnh mạnh giao diện điện thoại: sidebar, header, card, form, action button, layout của chat và các experience để dùng được tốt trên màn hình nhỏ.
- Tối ưu lại thứ tự card, kích thước card, khoảng trắng, badge, và các chi tiết hiển thị để trang chủ và trong chat nhìn thống nhất hơn trên cả desktop lẫn mobile.

#### Khó nhất tuần này
- Mobile layout phát sinh rất nhiều lỗi nhỏ: card không đều, sidebar bị lộ, header chiếm chỗ, button xuống dòng, dropdown bị tràn.
- Một thay đổi ở shared CSS dễ ảnh hưởng dây chuyền sang nhiều màn khác nhau.

#### AI tool đã dùng
| Tool | Dùng để làm gì | Kết quả |
|---|---|---|
| Cursor | Soát CSS và gợi ý media query / layout fix | Tăng tốc xử lý lỗi hiển thị trên điện thoại |
| Claude Code | Kiểm tra lại tính nhất quán của các component giao diện | Hạn chế regression khi chỉnh nhiều màn cùng lúc |

#### Học được
- Với sản phẩm web có nhiều trạng thái trong cùng một màn chat, mobile không thể chỉ “co nhỏ desktop” mà cần thiết kế lại điểm nhấn, khoảng cách và thứ tự ưu tiên.
- Những chi tiết nhỏ như padding, badge, vị trí icon hay trạng thái đóng/mở sidebar ảnh hưởng mạnh đến cảm nhận hoàn thiện của sản phẩm.

#### Nếu làm lại, sẽ làm khác
- Dựng sớm bộ breakpoint và checklist UI mobile thay vì sửa từng lỗi sau khi tính năng đã nhiều.
- Tách rõ hơn rule CSS theo từng vùng trải nghiệm để việc fix không lan rộng.

#### Kế hoạch tuần tới
- Hoàn thiện đầy đủ flow tạo bộ đề / tài liệu ôn THPTQG và các experience liên quan.
- Kết nối chặt hơn giữa frontend, backend và hạ tầng chạy dự án.

---

### Tuần 5 — 28/04/2026

**Thành viên:** Nguyễn Triệu Gia Khánh - 2A202600225, Nguyễn Xuân Hải - 2A202600245

#### Đã làm
- Hoàn thiện phần lớn chức năng web theo hướng sản phẩm thật cho ôn thi THPTQG môn Tiếng Anh: từ trang chủ, chatbot, các card tạo nội dung đến các màn trải nghiệm sau khi generate.
- Xây đầy đủ hơn flow `Full Set` để người dùng có thể đi từ chọn nguồn đầu vào đến xem kết quả hỗn hợp trong cùng một trải nghiệm.
- Làm backend và logic hiển thị cho quiz / flashcard / slide ổn định hơn; đồng thời xử lý nhiều lỗi phát sinh ở state, title, session name, action header và navigation trong chat.
- Chuẩn hóa thêm phần chạy dự án bằng Docker để môi trường dev và demo bớt lệch nhau; xử lý các lỗi liên quan đến route backend, hot reload và dependency khi thêm chức năng mới.

#### Khó nhất tuần này
- Đồng bộ nhiều lớp cùng lúc: frontend, backend, session state, Docker và API.
- Một số tính năng nhìn có vẻ chỉ là UI nhưng thực tế liên quan đến state và lifecycle của cả đoạn chat.

#### AI tool đã dùng
| Tool | Dùng để làm gì | Kết quả |
|---|---|---|
| Cursor | Hỗ trợ rà soát các điểm nối giữa frontend / backend / Docker | Giảm thời gian dò lỗi môi trường |
| Claude Code | Gợi ý cách sắp xếp lại luồng trải nghiệm và trạng thái chat | Giúp flow các card mạch lạc hơn |

#### Học được
- Khi sản phẩm bắt đầu có nhiều experience thật, phần “keo nối” giữa UI và backend quan trọng không kém tính năng chính.
- Docker rất hữu ích để demo và chạy đồng nhất, nhưng chỉ thực sự hiệu quả khi command, dependency và mount code được cấu hình đúng từ đầu.

#### Nếu làm lại, sẽ làm khác
- Viết checklist deploy/dev container sớm hơn để tránh mất thời gian vì lỗi môi trường.
- Gom sớm các hành vi dùng chung của 4 card để giảm số nơi phải sửa khi đổi UX.

#### Kế hoạch tuần tới
- Hoàn thiện nốt các chức năng export / trình chiếu / trải nghiệm slide.
- Đánh giá hướng RAG/OCR sau khi có web hoàn chỉnh hơn, xem phần nào thật sự phù hợp với nhu cầu tốc độ và trải nghiệm người dùng.

---

### Tuần 6 — Sau 5/05/2026

**Thành viên:** Nguyễn Triệu Gia Khánh - 2A202600225, Nguyễn Xuân Hải - 2A202600245

#### Đã làm
- Hoàn thiện tiếp phần slide experience: chế độ trình chiếu, xem lướt, chỉnh sửa trong web, tải xuống PDF, và xử lý nhiều lỗi layout / export để kết quả gần với phần trình chiếu nhất có thể.
- Rà soát lại toàn bộ hành trình người dùng trên web, từ trang chủ, tạo chat mới, chọn card, điền form, xem kết quả cho tới các trải nghiệm riêng của quiz / flashcard / slide / full set.
- Đánh giá thử hướng RAG/OCR cho bài toán tài liệu. Trong giai đoạn này, bạn Hải đã dành công sức tìm và triển khai thử một số hướng xử lý RAG/OCR để mở rộng khả năng làm việc với tài liệu PDF và markdown.
- Sau khi so sánh với mục tiêu sản phẩm hiện tại, mình nhận thấy hướng đó phù hợp hơn cho nghiên cứu / grounding theo tài liệu, nhưng chưa tối ưu cho trải nghiệm “ra kết quả nhanh, ít chờ” mà web đang ưu tiên. Vì vậy mình chủ động tổ chức và làm lại phần lõi theo hướng gọn hơn, bám sát nhu cầu người dùng cuối và giữ ổn định các chức năng đang có.

#### Khó nhất tuần này
- Cân bằng giữa hai mục tiêu: một bên là muốn hệ thống thông minh hơn nhờ RAG/OCR, một bên là tốc độ phản hồi và sự mượt mà của trải nghiệm web.
- Khi hệ thống đã có nhiều tính năng chạy được, mọi thay đổi ở tầng lõi đều phải rất cẩn thận để không ảnh hưởng các chức năng hiện có.

#### AI tool đã dùng
| Tool | Dùng để làm gì | Kết quả |
|---|---|---|
| Cursor | Soát lại logic export slide, state trải nghiệm và các lỗi layout phức tạp | Giúp hoàn thiện vòng cuối của tính năng slide |
| Claude Code | Hỗ trợ phân tích trade-off giữa hướng RAG/OCR và hướng tối ưu cho UX hiện tại | Có cơ sở rõ hơn để quyết định giữ / bỏ từng phần |

#### Học được
- Không phải hướng kỹ thuật nào “mạnh” hơn cũng phù hợp hơn với sản phẩm ở thời điểm hiện tại; nếu mục tiêu là tốc độ và tính ổn định thì đôi khi giải pháp gọn, trực tiếp lại hiệu quả hơn.
- Với sản phẩm giáo dục theo flow tạo nội dung, trải nghiệm người dùng mượt và dễ hiểu là giá trị nhìn thấy ngay, còn các lớp intelligence nâng cao nên đưa vào từng bước khi thật sự khớp nhu cầu.

#### Nếu làm lại, sẽ làm khác
- Chốt tiêu chí đánh giá sớm hơn cho các hướng như RAG/OCR: mục tiêu là research, độ bám tài liệu hay tốc độ phản hồi cho người dùng cuối.
- Tách sớm hơn phần thử nghiệm nghiên cứu với phần lõi chạy production để việc đánh giá và thay đổi sau này nhẹ nhàng hơn.

#### Kế hoạch tiếp theo
- Tiếp tục tinh gọn pipeline tạo nội dung theo hướng nhanh, ổn định và dễ mở rộng cho cả 4 card.
- Chỉ giữ hoặc tích hợp lại các phần liên quan đến RAG/OCR khi chúng chứng minh được hiệu quả thực tế với trải nghiệm người dùng của Teachly.

---
