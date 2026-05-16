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
- Xây hệ thống đăng ký / đăng nhập người dùng: tạo bảng `users` và `auth_tokens` trong database, các endpoint `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`; mật khẩu được hash, token Bearer lưu phía client.
- Xây lưu session chat theo từng tài khoản: bảng `user_client_states` lưu toàn bộ danh sách session và active session index của mỗi user dưới dạng JSON; khi đăng nhập lại, frontend gọi `GET /api/auth/state` để khôi phục lịch sử chat đúng với tài khoản.
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

### Tuần 6 — 05/05/2026

**Thành viên:** Nguyễn Triệu Gia Khánh - 2A202600225, Nguyễn Xuân Hải - 2A202600245

#### Đã làm
- Hoàn thiện tiếp phần slide experience: chế độ trình chiếu, xem lướt, chỉnh sửa trong web, tải xuống PDF, và xử lý nhiều lỗi layout / export để kết quả gần với phần trình chiếu nhất có thể.
- Rà soát lại toàn bộ hành trình người dùng trên web, từ trang chủ, tạo chat mới, chọn card, điền form, xem kết quả cho tới các trải nghiệm riêng của quiz / flashcard / slide / full set.
- Trong giai đoạn mentor duty, bạn Hải phụ trách tester: test lại các flow chính của web, ghi lại các tính năng đã có / đang lỗi / cần chỉnh, và làm thư ký tổng hợp các ý anh mentor góp ý để nhóm bám vào khi sửa.
- Đánh giá thử hướng RAG/OCR cho bài toán tài liệu. Trong giai đoạn này, nhóm cũng dành thời gian tìm và triển khai thử một số hướng xử lý RAG/OCR để mở rộng khả năng làm việc với tài liệu PDF và markdown.

#### Khó nhất tuần này
- Khối lượng việc dồn vào cả làm tính năng, test thủ công, ghi nhận feedback mentor và sửa nhanh theo góp ý nên cần giữ nhịp phối hợp rất chặt.
- Cân bằng giữa hai mục tiêu: một bên là muốn hệ thống thông minh hơn nhờ RAG/OCR, một bên là tốc độ phản hồi và sự mượt mà của trải nghiệm web.
- Khi hệ thống đã có nhiều tính năng chạy được, mọi thay đổi ở tầng lõi đều phải rất cẩn thận để không ảnh hưởng các chức năng hiện có.

#### AI tool đã dùng
| Tool | Dùng để làm gì | Kết quả |
|---|---|---|
| Cursor | Soát lại logic export slide, state trải nghiệm và các lỗi layout phức tạp | Giúp hoàn thiện vòng cuối của tính năng slide |
| Claude Code | Hỗ trợ phân tích trade-off giữa hướng RAG/OCR và hướng tối ưu cho UX hiện tại, đồng thời hỗ trợ rà soát các flow cần test | Có cơ sở rõ hơn để quyết định giữ / bỏ từng phần và ưu tiên sửa lỗi |

#### Học được
- Việc có người đóng vai tester và ghi biên bản mentor duty giúp nhóm không bỏ sót lỗi nhỏ và không quên các góp ý quan trọng sau mỗi buổi trao đổi.
- Không phải hướng kỹ thuật nào “mạnh” hơn cũng phù hợp hơn với sản phẩm ở thời điểm hiện tại; nếu mục tiêu là tốc độ và tính ổn định thì đôi khi giải pháp gọn, trực tiếp lại hiệu quả hơn.
- Với sản phẩm giáo dục theo flow tạo nội dung, trải nghiệm người dùng mượt và dễ hiểu là giá trị nhìn thấy ngay, còn các lớp intelligence nâng cao nên đưa vào từng bước khi thật sự khớp nhu cầu.

#### Nếu làm lại, sẽ làm khác
- Chuẩn hóa sớm hơn checklist test thủ công và form ghi chú mentor duty để việc tổng hợp ý kiến, phân công sửa và kiểm tra lại được nhanh hơn.
- Chốt tiêu chí đánh giá sớm hơn cho các hướng như RAG/OCR: mục tiêu là research, độ bám tài liệu hay tốc độ phản hồi cho người dùng cuối.
- Tách sớm hơn phần thử nghiệm nghiên cứu với phần lõi chạy production để việc đánh giá và thay đổi sau này nhẹ nhàng hơn.

#### Kế hoạch tuần tới
- Tiếp tục sửa theo danh sách lỗi và góp ý đã ghi trong mentor duty.
- Tinh gọn phần lõi theo hướng nhanh, ổn định và dễ mở rộng hơn cho cả 4 card.

---

### Tuần 7 — 12/05/2026

**Thành viên:** Nguyễn Triệu Gia Khánh - 2A202600225, Nguyễn Xuân Hải - 2A202600245

#### Đã làm
- Tiếp tục hoàn thiện sản phẩm theo các góp ý đã tổng hợp: ưu tiên độ mượt của flow người dùng, sự ổn định của các card chính và cảm giác sẵn sàng để demo.
- Tổ chức và làm lại gọn hơn một số phần lõi để bám sát nhu cầu người dùng cuối, giảm độ nặng của các hướng chưa thật sự phù hợp với mục tiêu “ra kết quả nhanh, ít chờ”.
- Bạn Hải tiếp tục phụ trách tester: test lại các tính năng sau mỗi vòng sửa, rà lại những flow quan trọng trước khi demo, và cập nhật ghi chú tính năng / lỗi / góp ý mentor để nhóm theo dõi nhất quán.
- Duy trì vai trò thư ký trong mentor duty: ghi lại các nhận xét, điểm cần sửa, thứ tự ưu tiên và những lưu ý khi trình bày sản phẩm để cả nhóm không bị sót ý.

#### Khó nhất tuần này
- Sau khi có nhiều vòng sửa liên tiếp, nguy cơ regression tăng rõ rệt nên việc test lại thủ công từng flow tốn khá nhiều thời gian.
- Vừa phải giữ chất lượng code và trải nghiệm, vừa phải chuẩn bị sản phẩm ở trạng thái dễ trình bày với mentor và cho các buổi review.

#### AI tool đã dùng
| Tool | Dùng để làm gì | Kết quả |
|---|---|---|
| Cursor | Rà lại các lỗi giao diện và hành vi sau mỗi vòng chỉnh sửa | Giúp nhóm sửa nhanh hơn mà vẫn giữ được tính nhất quán |
| Claude Code | Hỗ trợ kiểm tra logic flow, điểm dễ regression và cách tinh gọn phần lõi | Giúp quyết định phần nào nên giữ, phần nào nên giảm bớt trước demo |

#### Học được
- Ở giai đoạn gần demo, test thủ công kỹ và ghi chép rõ ràng đôi khi quan trọng không kém việc thêm tính năng mới.
- Vai trò thư ký mentor duty rất hữu ích vì giúp chuyển góp ý miệng thành đầu việc cụ thể, dễ theo dõi và dễ kiểm tra lại sau khi sửa.

#### Nếu làm lại, sẽ làm khác
- Lập sớm hơn một log tính năng và bug theo từng buổi mentor để lúc rà lại không phải nhớ thủ công.
- Tách rõ hơn danh sách “phải sửa trước demo” và “có thể làm sau” để giữ tốc độ ra quyết định.

#### Kế hoạch tuần tới
- Chốt phiên bản ổn định nhất để sẵn sàng cho review / demo.
- Tiếp tục bám checklist test, feedback mentor và dọn những lỗi ảnh hưởng trực tiếp đến trải nghiệm người dùng.

---

### Tuần 8 — 16/05/2026 

**Thành viên:** Nguyễn Triệu Gia Khánh - 2A202600225, Nguyễn Xuân Hải - 2A202600245

#### Đã làm
- Hoàn thiện và xác nhận toàn bộ tính năng hoạt động đúng trên sản phẩm: hệ thống đăng nhập / đăng ký, lưu và khôi phục session theo từng tài khoản, tạo quiz, tạo flashcard, tạo slide (trình chiếu + tải PDF), tạo Full Set, hệ thống recommendation với AI fallback và autofill, upload tài liệu PDF.
- Kiểm tra lần cuối toàn bộ golden path từ đầu đến cuối: người dùng mới đăng ký → đăng nhập → chọn card → điền form → xem kết quả → tương tác với nội dung → đăng xuất → đăng nhập lại → lịch sử chat khôi phục đúng.
- Dọn dẹp các flag dev-only (dev badge) và các đoạn code thử nghiệm không dùng trong production; đảm bảo không còn artifact của quá trình phát triển trong build cuối.
- Sửa nốt các lỗi nhỏ còn sót từ danh sách mentor duty: chuẩn hóa hành vi overflow, căn chỉnh UI trên mobile, xử lý edge case khi AI trả về dữ liệu không đúng định dạng.
- Bạn Hải thực hiện pass test thủ công cuối cùng trên toàn bộ flow, xác nhận không còn lỗi nào ảnh hưởng đến trải nghiệm người dùng; tổng hợp ghi chú mentor duty lần cuối để đảm bảo mọi góp ý đã được xử lý.

#### Khó nhất tuần này
- Đảm bảo không có regression sau khi dọn code và sửa các lỗi nhỏ cuối cùng — mỗi thay đổi dù nhỏ vẫn phải test lại toàn bộ flow liên quan.
- Giữ được sự cân bằng giữa "chỉnh đến đủ tốt để demo" và "không làm bể thứ đang chạy đúng".

#### AI tool đã dùng
| Tool | Dùng để làm gì | Kết quả |
|---|---|---|
| Cursor | Rà soát code cuối, phát hiện điểm có thể gây lỗi edge case | Dọn sạch code trước khi submit |
| Claude Code | Kiểm tra logic flow auth + session restore, hỗ trợ fix bug khi popup đăng nhập tạo đè lên session cũ | Sửa đúng nguyên nhân gốc, không ảnh hưởng flow đã hoạt động |

#### Học được
- Một sản phẩm "xong" không chỉ có nghĩa là tính năng chạy được — còn là không còn lỗi nhìn thấy được, không còn code thừa, và người dùng mới có thể dùng thông suốt từ đầu đến cuối mà không cần hướng dẫn thêm.
- Việc phân vai rõ ràng trong suốt dự án (Khánh xây dựng, Hải test và ghi chép) giúp nhóm phủ được cả hai mặt kỹ thuật lẫn chất lượng sản phẩm mà không bị chồng chéo.
- Ở giai đoạn cuối, tốc độ ra quyết định ("sửa hay để nguyên") quan trọng không kém chất lượng từng quyết định — chần chừ quá lâu ở lỗi nhỏ dễ ăn hết thời gian còn lại.

#### Nếu làm lại, sẽ làm khác
- Giữ một checklist tính năng cố định từ tuần 4–5 và test theo checklist đó mỗi sprint thay vì test theo trí nhớ — sẽ giảm được thời gian pass cuối đáng kể.
- Tách môi trường dev và production rõ ràng hơn từ sớm để không phải dọn dev artifact vào tuần cuối.

---
