function parsePresetEntries(raw) {
  return String(raw || "")
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      return [parts[0] || "", parts[1] || "", parts[2] || ""];
    });
}

const ALL_EXTRA_RAW_FLASH_PRESETS = [
  {
    id: "flash-travel-essentials",
    topic: "Từ vựng du lịch thông dụng",
    basis: "English + Nghĩa tiếng Việt + Ví dụ ngắn",
    count: 20,
    notes: "Tập trung từ vựng về sân bay, khách sạn, hành trình và trải nghiệm du lịch.",
    entries: parsePresetEntries(`
      accommodation|chỗ ở|Example: We booked cheap accommodation near the station.
      itinerary|lịch trình|Example: The tour guide shared the full itinerary by email.
      departure|sự khởi hành|Example: Please arrive two hours before departure.
      arrival|sự đến nơi|Example: Our arrival was delayed by heavy rain.
      destination|điểm đến|Example: Da Nang is a popular summer destination.
      luggage|hành lý|Example: Do not leave your luggage unattended.
      passport|hộ chiếu|Example: Keep your passport in a safe place.
      boarding pass|thẻ lên máy bay|Example: Show your boarding pass at the gate.
      check in|làm thủ tục nhận phòng/chuyến bay|Example: We checked in online last night.
      check out|trả phòng|Example: Guests must check out before noon.
      reservation|sự đặt chỗ|Example: I confirmed the hotel reservation yesterday.
      sightseeing|tham quan|Example: We spent the morning sightseeing in the old town.
      landmark|địa danh nổi tiếng|Example: The bridge is a famous local landmark.
      tour guide|hướng dẫn viên du lịch|Example: The tour guide spoke very clearly.
      hostel|nhà trọ du lịch|Example: Students often stay in a hostel to save money.
      resort|khu nghỉ dưỡng|Example: The resort offers free breakfast.
      souvenir|quà lưu niệm|Example: She bought a souvenir for her parents.
      customs|hải quan|Example: We waited in line at customs for thirty minutes.
      visa|thị thực|Example: Some countries require a visa in advance.
      schedule|lịch trình, thời gian biểu|Example: The train schedule changed this week.
      delayed|bị hoãn|Example: Our flight was delayed because of fog.
      direct flight|chuyến bay thẳng|Example: A direct flight saves a lot of time.
      transfer|sự trung chuyển, đổi chuyến|Example: We had a short transfer in Bangkok.
      route|tuyến đường|Example: This route is faster in the evening.
      baggage claim|khu nhận hành lý|Example: Meet me at baggage claim number three.
      currency exchange|đổi tiền|Example: The airport currency exchange was expensive.
      local cuisine|ẩm thực địa phương|Example: Trying local cuisine is my favorite part of traveling.
      package tour|tour trọn gói|Example: My aunt booked a package tour for the family.
      backpack|ba lô du lịch|Example: A light backpack is more convenient for long trips.
      adventurous|ưa phiêu lưu|Example: He is adventurous and loves mountain trekking.
      scenic|có phong cảnh đẹp|Example: We chose the scenic route along the coast.
      brochure|tờ giới thiệu du lịch|Example: The brochure includes a city map.
      cancellation|sự hủy bỏ|Example: Late cancellation may cost extra money.
      admission fee|phí vào cửa|Example: Students pay a lower admission fee.
      travel insurance|bảo hiểm du lịch|Example: Travel insurance can protect you in emergencies.
      shuttle bus|xe trung chuyển|Example: The hotel provides a free shuttle bus.
      peak season|mùa cao điểm|Example: Prices rise sharply in peak season.
      off-season|mùa thấp điểm|Example: Off-season travel is usually cheaper.
      guided tour|chuyến tham quan có hướng dẫn|Example: We joined a guided tour of the museum.
      layover|thời gian chờ giữa hai chuyến bay|Example: Our layover lasted nearly four hours.
    `),
  },
  {
    id: "flash-technology-digital-life",
    topic: "Từ vựng công nghệ và đời sống số",
    basis: "Word + Nghĩa + Gợi ý dùng",
    count: 22,
    notes: "Phù hợp cho chủ đề AI, internet, thiết bị số và an toàn trực tuyến.",
    entries: parsePresetEntries(`
      device|thiết bị|Hint: smart device / electronic device.
      application|ứng dụng|Hint: install a mobile application.
      password|mật khẩu|Hint: create a strong password.
      account|tài khoản|Hint: sign in to your account.
      browser|trình duyệt|Hint: open the link in your browser.
      platform|nền tảng|Hint: an online learning platform.
      algorithm|thuật toán|Hint: social media algorithm.
      database|cơ sở dữ liệu|Hint: store information in a database.
      update|cập nhật|Hint: download the latest update.
      download|tải xuống|Hint: download a file safely.
      upload|tải lên|Hint: upload your assignment before midnight.
      privacy|quyền riêng tư|Hint: protect user privacy.
      encryption|mã hóa|Hint: end-to-end encryption.
      malware|phần mềm độc hại|Hint: malware can damage your system.
      hacker|tin tặc|Hint: hackers often target weak accounts.
      firewall|tường lửa|Hint: turn on the firewall for extra security.
      notification|thông báo|Hint: mute unnecessary notifications.
      cloud storage|lưu trữ đám mây|Hint: save documents in cloud storage.
      backup|bản sao lưu|Hint: make a backup every week.
      interface|giao diện|Hint: a user-friendly interface.
      virtual|ảo|Hint: a virtual classroom.
      chatbot|trò chuyện tự động|Hint: the chatbot answers common questions.
      artificial intelligence|trí tuệ nhân tạo|Hint: artificial intelligence supports many industries.
      machine learning|học máy|Hint: machine learning improves through data.
      cybersecurity|an ninh mạng|Hint: schools should teach cybersecurity basics.
      digital literacy|năng lực số|Hint: digital literacy is essential today.
      screen time|thời gian dùng màn hình|Hint: reduce screen time before bed.
      subscription|gói đăng ký|Hint: cancel the subscription if you do not use it.
      streaming|phát trực tuyến|Hint: streaming services are very popular.
      content creator|người sáng tạo nội dung|Hint: many students want to be a content creator.
      search engine|công cụ tìm kiếm|Hint: use a search engine to find reliable sources.
      keyword|từ khóa|Hint: choose a precise keyword for better results.
      wireless|không dây|Hint: wireless headphones are more convenient.
      network|mạng lưới, mạng internet|Hint: the network is unstable today.
      signal|tín hiệu|Hint: there is no signal in this area.
      virus|vi-rút máy tính|Hint: an antivirus tool can detect a virus.
      compatible|tương thích|Hint: this software is not compatible with old devices.
      feature|tính năng|Hint: the app offers a useful new feature.
      access|truy cập|Hint: students can access materials online.
      troubleshoot|khắc phục sự cố|Hint: the technician helped me troubleshoot the issue.
    `),
  },
  {
    id: "flash-health-lifestyle",
    topic: "Từ vựng sức khỏe và lối sống",
    basis: "English + Nghĩa tiếng Việt + Cụm dùng",
    count: 24,
    notes: "Bám chủ đề chăm sóc sức khỏe, dinh dưỡng, giấc ngủ và thói quen sống lành mạnh.",
    entries: parsePresetEntries(`
      balanced diet|chế độ ăn cân bằng|Use: A balanced diet helps teenagers grow well.
      nutrient|chất dinh dưỡng|Use: Vegetables provide important nutrients.
      protein|chất đạm|Use: Eggs are rich in protein.
      vitamin|vitamin|Use: Citrus fruit contains vitamin C.
      mineral|khoáng chất|Use: Milk gives the body useful minerals.
      hydration|sự cung cấp đủ nước|Use: Hydration is crucial in hot weather.
      exercise|tập thể dục|Use: Regular exercise improves mood and stamina.
      workout|buổi tập luyện|Use: His workout lasts forty minutes.
      stamina|sức bền|Use: Running can build stamina over time.
      obesity|béo phì|Use: Obesity may lead to serious illness.
      symptom|triệu chứng|Use: A fever is a common symptom of flu.
      treatment|sự điều trị|Use: The doctor recommended early treatment.
      recovery|sự hồi phục|Use: Sleep supports faster recovery.
      immunity|khả năng miễn dịch|Use: Fresh fruit may strengthen immunity.
      calorie|calo|Use: Sugary drinks contain many calories.
      habit|thói quen|Use: Reading before bed is a relaxing habit.
      routine|thói quen hằng ngày|Use: A morning routine helps her stay organized.
      meditation|thiền|Use: Meditation can reduce stress.
      stress|căng thẳng|Use: Too much stress affects concentration.
      anxiety|lo âu|Use: Deep breathing can ease anxiety.
      insomnia|mất ngủ|Use: Insomnia can make students tired at school.
      therapy|liệu pháp|Use: Therapy may help people manage emotions.
      prescription|đơn thuốc|Use: You need a prescription for this medicine.
      appointment|cuộc hẹn khám|Use: I have a dental appointment tomorrow.
      infection|sự nhiễm trùng|Use: Wash cuts carefully to avoid infection.
      prevent|ngăn ngừa|Use: Vaccines help prevent disease.
      recover|hồi phục|Use: She recovered quickly after the operation.
      fitness|thể lực|Use: Swimming is good for overall fitness.
      flexibility|độ dẻo|Use: Stretching improves flexibility.
      posture|tư thế|Use: Good posture reduces back pain.
      supplement|thực phẩm bổ sung|Use: Do not overuse supplements without advice.
      fiber|chất xơ|Use: Whole grains contain plenty of fiber.
      appetite|sự thèm ăn|Use: Exercise can increase appetite.
      fatigue|mệt mỏi|Use: Fatigue is common during exam season.
      consultation|buổi tư vấn, khám|Use: The consultation lasted fifteen minutes.
      diagnose|chẩn đoán|Use: The doctor diagnosed a mild infection.
      sanitation|vệ sinh|Use: Poor sanitation causes health problems.
      hygiene|vệ sinh cá nhân|Use: Good hygiene protects against germs.
      well-being|sức khỏe tinh thần và thể chất|Use: Music can improve emotional well-being.
      sedentary|ít vận động|Use: A sedentary lifestyle is unhealthy.
    `),
  },
  {
    id: "flash-school-collocations",
    topic: "Collocations về trường học",
    basis: "Collocation + Nghĩa + Ví dụ",
    count: 20,
    notes: "Dùng cho speaking, writing và các chủ đề school life, exam preparation.",
    entries: parsePresetEntries(`
      meet a deadline|kịp hạn nộp|Example: Students must meet every deadline.
      submit an assignment|nộp bài tập|Example: Please submit the assignment online.
      take an exam|dự thi|Example: We will take an exam next Friday.
      pass an exam|đỗ kỳ thi|Example: She passed the exam with ease.
      fail an exam|trượt kỳ thi|Example: He failed the exam because he did not revise.
      revise lessons|ôn lại bài học|Example: I revise lessons every evening.
      miss a class|bỏ lỡ một buổi học|Example: She missed a class due to illness.
      attend a lecture|tham dự bài giảng|Example: Many students attended the lecture.
      take notes|ghi chép|Example: Good learners take notes carefully.
      raise a question|đặt câu hỏi|Example: Feel free to raise a question at the end.
      do homework|làm bài tập về nhà|Example: He does homework right after dinner.
      work in pairs|làm việc theo cặp|Example: The teacher asked us to work in pairs.
      give feedback|đưa phản hồi|Example: Teachers should give feedback quickly.
      improve pronunciation|cải thiện phát âm|Example: Podcasts help improve pronunciation.
      build vocabulary|xây dựng vốn từ|Example: Reading helps build vocabulary.
      solve a problem|giải quyết vấn đề|Example: We solved the grammar problem together.
      make progress|đạt tiến bộ|Example: She has made progress in speaking.
      gain confidence|tăng tự tin|Example: Practice helps students gain confidence.
      join a club|tham gia câu lạc bộ|Example: He joined a debate club this year.
      prepare a presentation|chuẩn bị bài thuyết trình|Example: We prepared a presentation on climate change.
      complete a task|hoàn thành nhiệm vụ|Example: Try to complete the task in ten minutes.
      ask for help|xin giúp đỡ|Example: Weak students should ask for help early.
      share ideas|chia sẻ ý tưởng|Example: Group work allows students to share ideas.
      check answers|kiểm tra đáp án|Example: Always check answers before submitting.
      manage time|quản lý thời gian|Example: Exam success depends on how you manage time.
      follow instructions|làm theo hướng dẫn|Example: Read and follow instructions carefully.
      join a discussion|tham gia thảo luận|Example: Everyone should join the discussion.
      present an argument|trình bày lập luận|Example: The writer presents an argument clearly.
      compare results|so sánh kết quả|Example: The class compared results after the test.
      set a goal|đặt mục tiêu|Example: She set a goal to learn ten words a day.
      sit a test|làm bài kiểm tra|Example: We sat a short vocabulary test this morning.
      review mistakes|xem lại lỗi sai|Example: Review mistakes after each practice paper.
      reach a target|đạt mục tiêu|Example: He reached his target score in April.
      memorize formulas|ghi nhớ công thức|Example: Some students memorize formulas too mechanically.
      participate actively|tham gia tích cực|Example: Quiet students should participate actively.
      improve grades|cải thiện điểm số|Example: Better habits can improve grades quickly.
      misspell a word|viết sai chính tả một từ|Example: She often misspells difficult words.
      answer correctly|trả lời đúng|Example: Only half the class answered correctly.
      cite evidence|trích dẫn bằng chứng|Example: Strong essays cite evidence from the text.
      conduct research|thực hiện nghiên cứu|Example: University students conduct research projects.
    `),
  },
  {
    id: "flash-jobs-careers",
    topic: "Từ vựng nghề nghiệp và định hướng tương lai",
    basis: "Word/phrase + Nghĩa + Gợi ý học",
    count: 23,
    notes: "Phục vụ chủ đề job interview, career path, skills and workplace.",
    entries: parsePresetEntries(`
      occupation|nghề nghiệp|Hint: ask about someone's occupation.
      profession|ngành nghề chuyên môn|Hint: teaching is a respected profession.
      qualification|bằng cấp, trình độ|Hint: the job requires formal qualifications.
      experience|kinh nghiệm|Hint: work experience matters in interviews.
      internship|kỳ thực tập|Hint: she did an internship at a local company.
      resume|sơ yếu lý lịch|Hint: update your resume before applying.
      cover letter|thư xin việc|Hint: write a clear cover letter.
      candidate|ứng viên|Hint: the best candidate was well prepared.
      recruit|tuyển dụng|Hint: companies recruit skilled workers.
      employer|nhà tuyển dụng|Hint: employers value communication skills.
      employee|nhân viên|Hint: every employee receives training.
      promotion|sự thăng chức|Hint: he got a promotion last month.
      salary|mức lương|Hint: salary is not the only factor to consider.
      wage|tiền công|Hint: factory workers earn hourly wages.
      teamwork|làm việc nhóm|Hint: teamwork is essential in most jobs.
      leadership|khả năng lãnh đạo|Hint: the program develops leadership skills.
      responsibility|trách nhiệm|Hint: taking responsibility builds trust.
      deadline|hạn chót|Hint: journalists often work under tight deadlines.
      flexible|linh hoạt|Hint: flexible workers adapt more easily.
      reliable|đáng tin cậy|Hint: reliable staff are highly valued.
      punctual|đúng giờ|Hint: being punctual creates a good impression.
      productivity|năng suất|Hint: good tools improve productivity.
      career path|lộ trình nghề nghiệp|Hint: plan your career path early.
      self-employed|tự làm chủ|Hint: my uncle is self-employed.
      shift work|làm theo ca|Hint: nurses often do shift work.
      workload|khối lượng công việc|Hint: the workload increases at the end of the month.
      colleague|đồng nghiệp|Hint: friendly colleagues make work easier.
      supervise|giám sát|Hint: senior staff supervise new workers.
      negotiate|đàm phán|Hint: managers must negotiate effectively.
      entrepreneur|doanh nhân|Hint: she dreams of becoming an entrepreneur.
      freelance|làm tự do|Hint: many designers work freelance.
      vacancy|vị trí trống|Hint: I saw a vacancy on the company website.
      apply for|nộp đơn xin|Hint: he applied for a part-time position.
      resign|từ chức|Hint: she resigned to continue her studies.
      retire|nghỉ hưu|Hint: my grandfather retired at sixty.
      skill set|bộ kỹ năng|Hint: develop a skill set that matches the job.
      job satisfaction|sự hài lòng với công việc|Hint: money does not guarantee job satisfaction.
      training session|buổi đào tạo|Hint: all interns attended the training session.
      performance review|đánh giá hiệu suất|Hint: the annual performance review was positive.
      career ambition|tham vọng nghề nghiệp|Hint: his career ambition is to become a pilot.
    `),
  },
  {
    id: "flash-emotions-personality",
    topic: "Từ vựng cảm xúc và tính cách",
    basis: "Word + Nghĩa + Câu gợi nhớ",
    count: 25,
    notes: "Phục vụ speaking về bản thân, relationships, social issues và mental health.",
    entries: parsePresetEntries(`
      cheerful|vui vẻ|Memory: A cheerful person smiles a lot.
      optimistic|lạc quan|Memory: Optimistic students expect good results.
      pessimistic|bi quan|Memory: Pessimistic people focus on problems.
      patient|kiên nhẫn|Memory: Teachers need to be patient with weak learners.
      impatient|thiếu kiên nhẫn|Memory: He gets impatient in long queues.
      generous|hào phóng|Memory: A generous friend shares notes willingly.
      selfish|ích kỷ|Memory: Selfish behavior hurts teamwork.
      honest|trung thực|Memory: Honest answers build trust.
      dishonest|không trung thực|Memory: Dishonest people hide the truth.
      confident|tự tin|Memory: Confident speakers look at the audience.
      shy|rụt rè|Memory: Shy students may avoid public speaking.
      ambitious|tham vọng|Memory: She is ambitious about her future career.
      responsible|có trách nhiệm|Memory: Responsible people finish tasks on time.
      careless|bất cẩn|Memory: Careless mistakes can lower your score.
      creative|sáng tạo|Memory: Creative writers use fresh ideas.
      curious|tò mò, ham học hỏi|Memory: Curious learners ask many questions.
      nervous|lo lắng|Memory: He felt nervous before the interview.
      relieved|nhẹ nhõm|Memory: She was relieved after finishing the exam.
      frustrated|bực bội|Memory: Many students feel frustrated with long readings.
      grateful|biết ơn|Memory: I am grateful for my parents' support.
      jealous|ghen tị|Memory: Jealousy can damage friendship.
      lonely|cô đơn|Memory: Moving to a new city may make students lonely.
      motivated|có động lực|Memory: Clear goals keep learners motivated.
      exhausted|kiệt sức|Memory: He looked exhausted after the night shift.
      polite|lịch sự|Memory: Polite language creates a good impression.
      rude|thô lỗ|Memory: Rude comments can start arguments.
      sensitive|nhạy cảm|Memory: Sensitive people react strongly to criticism.
      stubborn|bướng bỉnh|Memory: A stubborn child refuses to change plans.
      sympathetic|cảm thông|Memory: Good friends are sympathetic listeners.
      tolerant|khoan dung|Memory: A tolerant class accepts different opinions.
      courageous|can đảm|Memory: It was courageous of her to speak up.
      humble|khiêm tốn|Memory: Humble people do not boast about success.
      reliable|đáng tin cậy|Memory: A reliable teammate always shows up.
      enthusiastic|nhiệt tình|Memory: Enthusiastic volunteers work with energy.
      mature|trưởng thành|Memory: Mature decisions require careful thought.
      insecure|thiếu tự tin, bất an|Memory: Social media can make teens insecure.
      calm|điềm tĩnh|Memory: Stay calm and read the question again.
      aggressive|hung hăng, hiếu chiến|Memory: Aggressive behavior causes conflict.
      compassionate|trắc ẩn|Memory: Nurses need to be compassionate.
      independent|độc lập|Memory: University life requires independent study.
    `),
  },
  {
    id: "flash-family-relationships",
    topic: "Từ vựng gia đình và các mối quan hệ",
    basis: "Word/phrase + Nghĩa + Gợi ý ngữ cảnh",
    count: 21,
    notes: "Dùng cho speaking và writing về family life, generation gap, relationships.",
    entries: parsePresetEntries(`
      sibling|anh chị em ruột|Context: She gets along well with her siblings.
      relative|họ hàng|Context: Many relatives came to the wedding.
      household|hộ gia đình|Context: Household expenses are rising.
      generation gap|khoảng cách thế hệ|Context: Technology can widen the generation gap.
      upbringing|sự nuôi dạy|Context: A loving upbringing shapes confidence.
      bond|mối gắn kết|Context: Shared experiences strengthen family bonds.
      argument|cuộc cãi vã|Context: Small arguments happen in every home.
      conflict|xung đột|Context: Poor communication may lead to conflict.
      support|sự hỗ trợ|Context: Teenagers need emotional support.
      trust|sự tin tưởng|Context: Trust is essential in any relationship.
      respect|sự tôn trọng|Context: Children should show respect to elders.
      affection|tình cảm yêu thương|Context: Grandparents often show quiet affection.
      responsibility|trách nhiệm|Context: Older children may share household responsibilities.
      discipline|kỷ luật|Context: Balanced discipline is more effective than punishment.
      guidance|sự hướng dẫn|Context: Career guidance from parents can be helpful.
      reunion|cuộc đoàn tụ|Context: Tet is a time for family reunions.
      ancestor|tổ tiên|Context: Many families honor their ancestors.
      marriage|hôn nhân|Context: Mutual respect supports a healthy marriage.
      divorce|ly hôn|Context: Divorce can affect children deeply.
      misunderstanding|sự hiểu lầm|Context: A simple talk can clear up misunderstanding.
      sympathy|sự cảm thông|Context: Sympathy matters in difficult times.
      relationship|mối quan hệ|Context: Social media can change relationships.
      nurture|nuôi dưỡng|Context: Parents nurture both skills and values.
      rely on|dựa vào|Context: Young children rely on adults for protection.
      care for|chăm sóc|Context: She cares for her younger sister after school.
      look up to|ngưỡng mộ|Context: Many children look up to their parents.
      get on with|hòa thuận với|Context: Do you get on with your cousins?
      raise a child|nuôi dạy con|Context: It is not easy to raise a child well.
      household chore|việc nhà|Context: Every member should share household chores.
      family value|giá trị gia đình|Context: Respect is a core family value.
      close-knit|gắn bó|Context: They come from a close-knit family.
      overprotective|bảo bọc quá mức|Context: Overprotective parents may limit independence.
      guidance counselor|cố vấn học đường|Context: The guidance counselor also supports families.
      guardian|người giám hộ|Context: The form needs a signature from a guardian.
      compromise|sự nhượng bộ|Context: Good relationships need compromise.
      quality time|thời gian chất lượng|Context: Busy parents try to spend quality time with children.
      celebrate together|cùng nhau ăn mừng|Context: Families celebrate together on special occasions.
      family tradition|truyền thống gia đình|Context: Cooking together is a family tradition.
      mutual understanding|sự thấu hiểu lẫn nhau|Context: Mutual understanding prevents conflict.
      emotional connection|sự kết nối cảm xúc|Context: Reading with children builds emotional connection.
    `),
  },
  {
    id: "flash-city-life-urbanization",
    topic: "Từ vựng đô thị hóa và đời sống thành phố",
    basis: "Word + Nghĩa + Collocation",
    count: 26,
    notes: "Phù hợp cho chủ đề urbanization, transport, housing và city problems.",
    entries: parsePresetEntries(`
      urbanization|đô thị hóa|Collocation: rapid urbanization.
      infrastructure|cơ sở hạ tầng|Collocation: improve public infrastructure.
      traffic jam|kẹt xe|Collocation: get stuck in a traffic jam.
      congestion|sự ùn tắc|Collocation: reduce traffic congestion.
      commuter|người đi làm đi học hằng ngày|Collocation: daily commuters.
      suburb|vùng ngoại ô|Collocation: live in the suburbs.
      downtown|trung tâm thành phố|Collocation: work downtown.
      skyscraper|tòa nhà chọc trời|Collocation: modern skyscrapers.
      residential area|khu dân cư|Collocation: a quiet residential area.
      pedestrian|người đi bộ|Collocation: pedestrian crossing.
      overpopulation|quá đông dân số|Collocation: urban overpopulation.
      pollution|ô nhiễm|Collocation: air pollution in major cities.
      housing shortage|thiếu nhà ở|Collocation: face a housing shortage.
      rent|tiền thuê|Collocation: rising rent prices.
      public transport|giao thông công cộng|Collocation: invest in public transport.
      bicycle lane|làn đường xe đạp|Collocation: build more bicycle lanes.
      green space|không gian xanh|Collocation: protect urban green spaces.
      noise pollution|ô nhiễm tiếng ồn|Collocation: reduce noise pollution.
      convenience|sự thuận tiện|Collocation: enjoy urban convenience.
      cost of living|chi phí sinh hoạt|Collocation: high cost of living.
      municipality|chính quyền thành phố|Collocation: the local municipality.
      overcrowded|quá đông đúc|Collocation: an overcrowded bus station.
      modern amenities|tiện nghi hiện đại|Collocation: apartments with modern amenities.
      waste management|quản lý rác thải|Collocation: improve waste management.
      street vendor|người bán hàng rong|Collocation: street vendors near schools.
      crosswalk|vạch qua đường|Collocation: stop at the crosswalk.
      urban sprawl|sự lan rộng đô thị|Collocation: uncontrolled urban sprawl.
      road maintenance|bảo trì đường sá|Collocation: better road maintenance.
      parking lot|bãi đỗ xe|Collocation: a crowded parking lot.
      high-rise building|tòa nhà cao tầng|Collocation: high-rise residential buildings.
      living standard|mức sống|Collocation: improve living standards.
      rush hour|giờ cao điểm|Collocation: avoid rush hour when possible.
      underpass|đường chui|Collocation: use the underpass safely.
      overpass|cầu vượt|Collocation: traffic flows faster thanks to the overpass.
      sidewalk|vỉa hè|Collocation: do not park on the sidewalk.
      sanitation system|hệ thống vệ sinh|Collocation: upgrade the sanitation system.
      urban planner|nhà quy hoạch đô thị|Collocation: urban planners design better cities.
      household waste|rác sinh hoạt|Collocation: separate household waste.
      neighborhood|khu phố|Collocation: a friendly neighborhood.
      settlement|khu định cư|Collocation: a new settlement on the edge of the city.
    `),
  },
  {
    id: "flash-science-space",
    topic: "Từ vựng khoa học và không gian",
    basis: "Term + Nghĩa + Ghi nhớ",
    count: 20,
    notes: "Bổ sung vốn từ cho reading về science, astronomy, research và innovation.",
    entries: parsePresetEntries(`
      galaxy|thiên hà|Remember: the Milky Way galaxy.
      planet|hành tinh|Remember: Earth is a planet.
      orbit|quỹ đạo|Remember: the Moon travels in orbit around Earth.
      astronaut|phi hành gia|Remember: astronauts train for years.
      telescope|kính thiên văn|Remember: a telescope helps us observe stars.
      satellite|vệ tinh|Remember: communication satellites circle Earth.
      gravity|trọng lực|Remember: gravity keeps us on the ground.
      universe|vũ trụ|Remember: scientists study the universe.
      comet|sao chổi|Remember: a comet has a bright tail.
      asteroid|tiểu hành tinh|Remember: asteroids are rocky objects in space.
      launch|phóng|Remember: the rocket will launch at dawn.
      mission|sứ mệnh|Remember: the mission aims to collect data.
      laboratory|phòng thí nghiệm|Remember: they tested the sample in the laboratory.
      experiment|thí nghiệm|Remember: every experiment needs a clear method.
      observation|sự quan sát|Remember: careful observation improves accuracy.
      innovation|sự đổi mới|Remember: innovation drives scientific progress.
      discovery|khám phá|Remember: the discovery changed modern medicine.
      evidence|bằng chứng|Remember: strong evidence supports the theory.
      theory|lý thuyết|Remember: a theory must be tested.
      researcher|nhà nghiên cứu|Remember: the researcher published the findings.
      sample|mẫu vật|Remember: take a soil sample for analysis.
      data analysis|phân tích dữ liệu|Remember: data analysis reveals patterns.
      hypothesis|giả thuyết|Remember: every project starts with a hypothesis.
      microscope|kính hiển vi|Remember: a microscope enlarges tiny objects.
      radiation|bức xạ|Remember: too much radiation is dangerous.
      vacuum|chân không|Remember: sound cannot travel in a vacuum.
      solar system|hệ Mặt Trời|Remember: the solar system has eight planets.
      eclipse|nhật thực/nguyệt thực|Remember: many people watched the eclipse.
      breakthrough|bước đột phá|Remember: the team made a medical breakthrough.
      renewable energy|năng lượng tái tạo|Remember: science supports renewable energy development.
      clone|nhân bản|Remember: the article discussed how to clone plants.
      genetic engineering|kỹ thuật di truyền|Remember: genetic engineering raises ethical questions.
      artificial satellite|vệ tinh nhân tạo|Remember: weather forecasts rely on artificial satellites.
      observatory|đài quan sát|Remember: the observatory opens at night.
      fuel efficiency|hiệu quả nhiên liệu|Remember: engineers seek better fuel efficiency.
      meteor|sao băng|Remember: we saw a meteor shower in August.
      crater|miệng hố|Remember: the moon surface has many craters.
      molecule|phân tử|Remember: water is made of simple molecules.
      measurement|sự đo lường|Remember: precise measurement matters in science.
      prototype|mẫu thử|Remember: the prototype was tested before mass production.
    `),
  },
  {
    id: "flash-weather-disasters",
    topic: "Từ vựng thời tiết và thiên tai",
    basis: "Word + Nghĩa + Ví dụ",
    count: 22,
    notes: "Dùng cho reading, speaking về climate, forecasts, disaster response.",
    entries: parsePresetEntries(`
      forecast|dự báo|Example: The weather forecast says it will rain.
      thunderstorm|giông bão|Example: A thunderstorm disrupted the outdoor event.
      lightning|tia chớp|Example: Lightning can be very dangerous.
      tornado|lốc xoáy|Example: The tornado damaged several houses.
      hurricane|bão lớn|Example: The hurricane forced people to evacuate.
      landslide|sạt lở đất|Example: Heavy rain caused a landslide in the mountains.
      drought|hạn hán|Example: The region suffered from a long drought.
      flood|lũ lụt|Example: The flood covered many roads.
      heatwave|đợt nắng nóng|Example: The city is experiencing a severe heatwave.
      earthquake|động đất|Example: People ran outside during the earthquake.
      eruption|sự phun trào|Example: The eruption covered the village with ash.
      tsunami|sóng thần|Example: The warning system detected a possible tsunami.
      evacuate|sơ tán|Example: Residents were told to evacuate immediately.
      shelter|nơi trú ẩn|Example: The school became a temporary shelter.
      rescue team|đội cứu hộ|Example: The rescue team arrived quickly.
      damage|thiệt hại|Example: The storm caused serious damage.
      casualty|thương vong|Example: Thankfully, there were few casualties.
      emergency supply|đồ tiếp tế khẩn cấp|Example: Emergency supplies were sent to the area.
      warning sign|dấu hiệu cảnh báo|Example: Dark clouds were a warning sign.
      climate pattern|mô hình khí hậu|Example: Scientists study climate patterns carefully.
      humid|ẩm|Example: It is hot and humid in July.
      chilly|lạnh se|Example: The evening turned chilly quite suddenly.
      breeze|gió nhẹ|Example: A cool breeze made the walk pleasant.
      drizzle|mưa phùn|Example: We kept walking in the drizzle.
      snowfall|tuyết rơi|Example: Snowfall is rare in this region.
      temperature drop|sự giảm nhiệt độ|Example: There was a sharp temperature drop overnight.
      volcanic ash|tro núi lửa|Example: Volcanic ash affected air travel.
      rescue operation|chiến dịch cứu hộ|Example: The rescue operation lasted all night.
      power outage|mất điện|Example: The storm caused a citywide power outage.
      relief effort|nỗ lực cứu trợ|Example: Volunteers joined the relief effort.
      coastal area|vùng ven biển|Example: Coastal areas are vulnerable to storms.
      rainfall|lượng mưa|Example: The region recorded heavy rainfall.
      storm surge|nước dâng do bão|Example: A storm surge flooded many streets.
      disaster preparedness|sự chuẩn bị phòng thiên tai|Example: Schools should teach disaster preparedness.
      aftershock|dư chấn|Example: Several aftershocks followed the main quake.
      mudslide|dòng bùn lở|Example: The mudslide blocked the mountain road.
      warning system|hệ thống cảnh báo|Example: The warning system saved many lives.
      rescue helicopter|trực thăng cứu hộ|Example: A rescue helicopter carried supplies.
      emergency drill|buổi diễn tập khẩn cấp|Example: Students practiced an emergency drill.
      severe weather|thời tiết khắc nghiệt|Example: Flights may be canceled during severe weather.
    `),
  },
  {
    id: "flash-media-communication",
    topic: "Từ vựng truyền thông và giao tiếp",
    basis: "Word/phrase + Nghĩa + Gợi ý",
    count: 24,
    notes: "Phục vụ chủ đề mass media, journalism, online communication và advertising.",
    entries: parsePresetEntries(`
      headline|tiêu đề báo|Hint: read the headline first.
      journalist|nhà báo|Hint: journalists verify information carefully.
      article|bài báo|Hint: the article discusses climate change.
      broadcast|phát sóng|Hint: the interview was broadcast live.
      audience|khán giả|Hint: the audience reacted positively.
      anchor|người dẫn bản tin|Hint: the anchor introduced the main stories.
      interview|phỏng vấn|Hint: she gave an interview on TV.
      editor|biên tập viên|Hint: the editor revised the draft.
      commentary|bình luận|Hint: sports commentary can be very lively.
      source|nguồn tin|Hint: always check the source of the news.
      misinformation|thông tin sai lệch|Hint: misinformation spreads quickly online.
      advertisement|quảng cáo|Hint: children often remember catchy advertisements.
      commercial|quảng cáo truyền hình|Hint: the commercial appeared during halftime.
      campaign|chiến dịch|Hint: the company launched a new campaign.
      slogan|khẩu hiệu|Hint: a short slogan is easy to remember.
      persuade|thuyết phục|Hint: advertisements try to persuade consumers.
      viewer|người xem|Hint: millions of viewers watched the finale.
      subscriber|người đăng ký theo dõi|Hint: the channel gained many subscribers.
      livestream|phát trực tiếp|Hint: the school event was livestreamed.
      viral|lan truyền mạnh|Hint: the clip went viral overnight.
      feedback|phản hồi|Hint: viewers left positive feedback.
      platform|nền tảng|Hint: each platform has a different audience.
      publication|ấn phẩm, sự xuất bản|Hint: the publication date was delayed.
      press conference|họp báo|Hint: the coach spoke at a press conference.
      press release|thông cáo báo chí|Hint: the company issued a press release.
      media literacy|năng lực hiểu truyền thông|Hint: media literacy helps students judge information.
      communication skill|kỹ năng giao tiếp|Hint: communication skills matter in every job.
      public opinion|dư luận|Hint: social media can shape public opinion.
      caption|chú thích ảnh|Hint: the caption explained the photo.
      documentary|phim tài liệu|Hint: I watched a documentary about wildlife.
      podcast|podcast|Hint: podcasts improve listening skills.
      comment section|phần bình luận|Hint: the comment section became toxic.
      trend|xu hướng|Hint: short videos are a major trend now.
      post|bài đăng|Hint: her post received thousands of likes.
      share|chia sẻ|Hint: do not share private information publicly.
      message across|truyền tải thông điệp|Hint: the video gets its message across clearly.
      audience reach|độ phủ khán giả|Hint: online ads can expand audience reach.
      breaking news|tin nóng|Hint: the app sent a breaking news alert.
      controversy|tranh cãi|Hint: the report caused public controversy.
      censorship|kiểm duyệt|Hint: some countries impose media censorship.
    `),
  },
  {
    id: "flash-food-cooking",
    topic: "Từ vựng ẩm thực và nấu ăn",
    basis: "Word + Nghĩa + Ví dụ ngắn",
    count: 20,
    notes: "Dùng cho các chủ đề lifestyle, culture, daily life và healthy eating.",
    entries: parsePresetEntries(`
      ingredient|nguyên liệu|Example: Fresh ingredients improve the dish.
      recipe|công thức nấu ăn|Example: My grandmother taught me the recipe.
      cuisine|ẩm thực|Example: Vietnamese cuisine is famous worldwide.
      flavor|hương vị|Example: The soup has a rich flavor.
      spicy|cay|Example: This sauce is too spicy for me.
      sour|chua|Example: Lemon juice gives the dish a sour taste.
      bitter|đắng|Example: Some herbal drinks taste bitter.
      sweet|ngọt|Example: Children often prefer sweet snacks.
      savory|đậm vị mặn/ngon miệng|Example: I prefer savory dishes to desserts.
      boil|luộc, đun sôi|Example: Boil the noodles for three minutes.
      fry|chiên, rán|Example: Do not fry food in very old oil.
      steam|hấp|Example: Steamed fish is healthier than fried fish.
      grill|nướng|Example: We grilled vegetables for dinner.
      chop|băm, cắt nhỏ|Example: Chop the onions finely.
      slice|thái lát|Example: Slice the bread into thin pieces.
      stir|khuấy|Example: Stir the soup gently.
      bake|nướng bánh|Example: She baked cookies for the class party.
      roast|quay, nướng|Example: Roast chicken smells amazing.
      appetizer|món khai vị|Example: We ordered soup as an appetizer.
      main course|món chính|Example: Rice was served with the main course.
      dessert|món tráng miệng|Example: Fruit salad is a light dessert.
      portion|khẩu phần|Example: The restaurant serves large portions.
      nutritious|giàu dinh dưỡng|Example: Nuts are nutritious snacks.
      organic|hữu cơ|Example: Organic vegetables are often more expensive.
      leftovers|đồ ăn thừa|Example: We saved the leftovers for lunch.
      beverage|đồ uống|Example: Tea is the most popular beverage here.
      ingredient list|danh sách thành phần|Example: Read the ingredient list carefully.
      seasoning|gia vị|Example: Add seasoning at the end.
      recipe book|sách dạy nấu ăn|Example: I borrowed a recipe book from the library.
      homemade|tự làm ở nhà|Example: Homemade soup tastes better.
      delicious|ngon|Example: The noodles were absolutely delicious.
      greasy|nhiều dầu mỡ|Example: Fast food can be greasy.
      tender|mềm|Example: Cook the meat until it is tender.
      raw|sống, chưa nấu|Example: Do not eat raw chicken.
      overcooked|nấu quá chín|Example: The vegetables were slightly overcooked.
      balanced meal|bữa ăn cân bằng|Example: Students need a balanced meal before exams.
      snack|bữa ăn nhẹ|Example: I brought a healthy snack to school.
      pantry|tủ đồ khô, nơi chứa thực phẩm|Example: Check the pantry before shopping.
      dining table|bàn ăn|Example: The family gathered around the dining table.
      serving spoon|muỗng múc thức ăn|Example: Use the serving spoon, please.
    `),
  },
  {
    id: "flash-sports-fitness",
    topic: "Từ vựng thể thao và vận động",
    basis: "Word + Nghĩa + Cụm học nhanh",
    count: 21,
    notes: "Phù hợp cho chủ đề healthy lifestyle, competitions, teamwork và training.",
    entries: parsePresetEntries(`
      athlete|vận động viên|Quick: a professional athlete.
      coach|huấn luyện viên|Quick: the coach gave useful advice.
      referee|trọng tài|Quick: the referee blew the whistle.
      tournament|giải đấu|Quick: the school hosted a tournament.
      opponent|đối thủ|Quick: they respected their opponent.
      championship|chức vô địch, giải vô địch|Quick: the team won the championship.
      spectator|khán giả|Quick: many spectators filled the stadium.
      training|sự tập luyện|Quick: daily training improves stamina.
      warm-up|khởi động|Quick: never skip the warm-up.
      endurance|sức bền|Quick: long-distance running builds endurance.
      strength|sức mạnh|Quick: weight training increases strength.
      agility|sự nhanh nhẹn|Quick: agility is vital in badminton.
      teamwork|làm việc đồng đội|Quick: good teamwork leads to success.
      discipline|kỷ luật|Quick: sports teach discipline.
      strategy|chiến thuật|Quick: the coach changed the strategy.
      score a goal|ghi bàn|Quick: he scored a goal in the final minute.
      break a record|phá kỷ lục|Quick: she broke a national record.
      lose balance|mất thăng bằng|Quick: he lost balance on the wet floor.
      take the lead|vươn lên dẫn trước|Quick: our team took the lead early.
      runner-up|á quân|Quick: they finished as runner-up.
      medal|huy chương|Quick: she won a gold medal.
      trophy|cúp|Quick: the captain lifted the trophy.
      fitness center|trung tâm thể hình|Quick: he goes to the fitness center after work.
      physical activity|hoạt động thể chất|Quick: regular physical activity prevents illness.
      injury|chấn thương|Quick: the player returned after a knee injury.
      recover from injury|hồi phục chấn thương|Quick: she is recovering from injury.
      competitive|mang tính cạnh tranh|Quick: it is a highly competitive sport.
      teamwork spirit|tinh thần đồng đội|Quick: teamwork spirit matters more than fame.
      work out regularly|tập đều đặn|Quick: he works out regularly.
      keep fit|giữ dáng, giữ sức khỏe|Quick: swimming helps people keep fit.
      cheering crowd|đám đông cổ vũ|Quick: the cheering crowd gave them energy.
      substitute player|cầu thủ dự bị|Quick: the substitute player changed the game.
      final match|trận chung kết|Quick: we watched the final match on TV.
      defend a title|bảo vệ danh hiệu|Quick: the champion hopes to defend the title.
      sportsmanship|tinh thần thể thao đẹp|Quick: good sportsmanship earns respect.
      penalty|quả phạt đền|Quick: the striker missed a penalty.
      whistle|còi|Quick: the whistle ended the game.
      track and field|điền kinh|Quick: track and field events attract many students.
      indoor court|sân trong nhà|Quick: they practised on an indoor court.
      outdoor activity|hoạt động ngoài trời|Quick: cycling is a healthy outdoor activity.
    `),
  },
  {
    id: "flash-housing-home",
    topic: "Từ vựng nhà ở và sinh hoạt gia đình",
    basis: "Word/phrase + Nghĩa + Ngữ cảnh",
    count: 20,
    notes: "Dùng cho speaking về home life, renting, household facilities và routines.",
    entries: parsePresetEntries(`
      apartment|căn hộ|Context: They moved into a small apartment downtown.
      detached house|nhà riêng biệt|Context: My grandparents live in a detached house.
      balcony|ban công|Context: We grow herbs on the balcony.
      basement|tầng hầm|Context: The washing machine is in the basement.
      attic|gác mái|Context: Old books are stored in the attic.
      living room|phòng khách|Context: The family watches TV in the living room.
      kitchen appliance|thiết bị nhà bếp|Context: Modern kitchen appliances save time.
      furniture|đồ nội thất|Context: The apartment is fully furnished.
      household bill|hóa đơn sinh hoạt|Context: Electricity is the highest household bill.
      landlord|chủ nhà cho thuê|Context: The landlord repaired the broken sink.
      tenant|người thuê nhà|Context: Each tenant has a separate key.
      maintenance|bảo trì|Context: The building needs regular maintenance.
      utility|tiện ích/điện nước|Context: Utilities are included in the rent.
      cozy|ấm cúng|Context: Their home feels small but cozy.
      spacious|rộng rãi|Context: The new kitchen is more spacious.
      renovate|cải tạo|Context: They plan to renovate the bathroom.
      relocate|chuyển nơi ở|Context: My uncle relocated for work.
      neighborhood|khu dân cư|Context: It is a quiet neighborhood.
      security system|hệ thống an ninh|Context: The house has a modern security system.
      laundry|giặt giũ|Context: I do the laundry every weekend.
      mop the floor|lau sàn|Context: He mopped the floor after dinner.
      vacuum cleaner|máy hút bụi|Context: The vacuum cleaner is in the closet.
      decorate|trang trí|Context: We decorated the room for Tet.
      shelf|kệ, giá|Context: Put the books back on the shelf.
      cupboard|tủ bếp|Context: Cups are stored in the cupboard.
      curtain|rèm cửa|Context: Thick curtains block the sunlight.
      electricity bill|hóa đơn điện|Context: The electricity bill was surprisingly high.
      running water|nước máy đang chảy|Context: Some villages lack running water.
      affordable housing|nhà ở giá phải chăng|Context: Cities need more affordable housing.
      move in|dọn vào ở|Context: We will move in next month.
      move out|dọn ra|Context: The tenants moved out last week.
      repair|sửa chữa|Context: The roof needs urgent repair.
      plumbing|hệ thống ống nước|Context: There is a plumbing problem in the kitchen.
      residence|nơi cư trú|Context: Students must provide proof of residence.
      shared house|nhà ở chung|Context: He lives in a shared house with friends.
      housework|việc nhà|Context: Children should help with housework.
      tidy up|dọn dẹp gọn gàng|Context: Please tidy up your bedroom.
      storage space|không gian lưu trữ|Context: The apartment lacks storage space.
      front yard|sân trước|Context: Her father grows flowers in the front yard.
      back yard|sân sau|Context: The children played in the back yard.
    `),
  },
  {
    id: "flash-shopping-consumerism",
    topic: "Từ vựng mua sắm và tiêu dùng",
    basis: "Word + Nghĩa + Câu dùng",
    count: 24,
    notes: "Phù hợp cho speaking về habits, consumer trends, online shopping và budgeting.",
    entries: parsePresetEntries(`
      customer|khách hàng|Sentence: The customer asked for a refund.
      consumer|người tiêu dùng|Sentence: Consumers compare prices online.
      bargain|món hời; mặc cả|Sentence: We found a bargain at the market.
      discount|giảm giá|Sentence: Students get a ten percent discount.
      refund|hoàn tiền|Sentence: The shop offered a full refund.
      receipt|hóa đơn mua hàng|Sentence: Keep the receipt in case of problems.
      cashier|thu ngân|Sentence: Pay the cashier before leaving.
      cart|xe đẩy mua hàng|Sentence: The cart was full of groceries.
      checkout|quầy thanh toán|Sentence: There were long lines at checkout.
      brand|thương hiệu|Sentence: Many teenagers care about fashion brands.
      quality|chất lượng|Sentence: Quality matters more than appearance.
      budget|ngân sách|Sentence: I shop carefully on a tight budget.
      impulse buying|mua hàng bốc đồng|Sentence: Social media encourages impulse buying.
      online order|đơn hàng trực tuyến|Sentence: My online order arrived early.
      delivery fee|phí giao hàng|Sentence: Free shipping saves the delivery fee.
      out of stock|hết hàng|Sentence: The product was out of stock yesterday.
      affordable|giá phải chăng|Sentence: Students need affordable textbooks.
      overpriced|đắt quá mức|Sentence: That bag looks overpriced.
      purchase|sự mua; mua|Sentence: It was an expensive purchase.
      exchange|đổi hàng|Sentence: The store allows exchange within seven days.
      warranty|bảo hành|Sentence: The phone comes with a one-year warranty.
      review|đánh giá|Sentence: Read customer reviews before buying.
      shopping mall|trung tâm thương mại|Sentence: The shopping mall gets crowded on weekends.
      convenience store|cửa hàng tiện lợi|Sentence: A convenience store stays open late.
      payment method|phương thức thanh toán|Sentence: Cashless payment is common now.
      installment|trả góp|Sentence: He bought the laptop by installment.
      second-hand|đã qua sử dụng|Sentence: Second-hand books are cheaper.
      promote|quảng bá|Sentence: Influencers promote many products online.
      advertisement|quảng cáo|Sentence: The advertisement targeted young consumers.
      queue up|xếp hàng|Sentence: We had to queue up for tickets.
      compare prices|so sánh giá|Sentence: Smart shoppers compare prices first.
      save up|tiết kiệm dần|Sentence: She saved up for a new tablet.
      fake product|hàng giả|Sentence: Avoid buying fake products online.
      loyalty card|thẻ khách hàng thân thiết|Sentence: The loyalty card offers extra points.
      shopping habit|thói quen mua sắm|Sentence: Online shopping changed our shopping habits.
      trend-driven|bị chi phối bởi xu hướng|Sentence: Teen purchases are often trend-driven.
      essential item|mặt hàng thiết yếu|Sentence: Rice is an essential item.
      waste money|lãng phí tiền|Sentence: Do not waste money on things you do not need.
      clear return policy|chính sách đổi trả rõ ràng|Sentence: Buyers trust stores with a clear return policy.
      promotional code|mã khuyến mãi|Sentence: I used a promotional code at checkout.
    `),
  },
  {
    id: "flash-social-issues",
    topic: "Từ vựng các vấn đề xã hội",
    basis: "Word/phrase + Nghĩa + Gợi ý ôn",
    count: 25,
    notes: "Hữu ích cho reading và writing về education, poverty, equality, community.",
    entries: parsePresetEntries(`
      poverty|nghèo đói|Review: poverty affects access to education.
      unemployment|thất nghiệp|Review: unemployment can increase stress.
      inequality|bất bình đẳng|Review: income inequality remains a major issue.
      discrimination|sự phân biệt đối xử|Review: laws should fight discrimination.
      violence|bạo lực|Review: schools must prevent violence early.
      homelessness|tình trạng vô gia cư|Review: charities support people facing homelessness.
      literacy|biết chữ|Review: literacy programs help rural adults.
      welfare|phúc lợi|Review: child welfare needs better support.
      charity|tổ chức từ thiện; lòng từ thiện|Review: students raised money for charity.
      donation|quyên góp|Review: online campaigns collect donations quickly.
      volunteer|tình nguyện viên; tình nguyện|Review: many teenagers volunteer in summer.
      access to education|quyền tiếp cận giáo dục|Review: every child deserves access to education.
      healthcare|chăm sóc y tế|Review: healthcare is expensive for some families.
      public awareness|nhận thức cộng đồng|Review: posters can raise public awareness.
      campaign|chiến dịch|Review: the campaign focused on road safety.
      equality|sự bình đẳng|Review: gender equality benefits society.
      inclusion|sự hòa nhập|Review: schools should promote inclusion.
      support service|dịch vụ hỗ trợ|Review: support services help vulnerable groups.
      social pressure|áp lực xã hội|Review: social pressure affects teenagers strongly.
      addiction|nghiện|Review: phone addiction is growing among teens.
      bullying|bắt nạt|Review: cyberbullying can be very damaging.
      neglect|sự bỏ bê|Review: child neglect has long-term effects.
      abuse|lạm dụng, bạo hành|Review: abuse cases must be reported quickly.
      migration|di cư|Review: climate change may increase migration.
      unemployment benefit|trợ cấp thất nghiệp|Review: some workers rely on unemployment benefits.
      fair treatment|sự đối xử công bằng|Review: everyone deserves fair treatment.
      human right|quyền con người|Review: education is a basic human right.
      social norm|chuẩn mực xã hội|Review: social norms change over time.
      underprivileged|thiếu điều kiện|Review: underprivileged students need scholarships.
      civic responsibility|trách nhiệm công dân|Review: voting is a civic responsibility.
      awareness campaign|chiến dịch nâng cao nhận thức|Review: the school ran an awareness campaign.
      gender bias|định kiến giới|Review: textbooks should avoid gender bias.
      public policy|chính sách công|Review: public policy can reduce inequality.
      community project|dự án cộng đồng|Review: the class joined a community project.
      social worker|nhân viên công tác xã hội|Review: a social worker visited the shelter.
      affordable healthcare|dịch vụ y tế giá phải chăng|Review: affordable healthcare improves well-being.
      emotional support|sự hỗ trợ tinh thần|Review: young people need emotional support.
      dropout rate|tỉ lệ bỏ học|Review: poverty can raise the dropout rate.
      food insecurity|tình trạng thiếu an ninh lương thực|Review: drought can cause food insecurity.
      equal opportunity|cơ hội bình đẳng|Review: education creates equal opportunity.
    `),
  },
  {
    id: "flash-internet-safety",
    topic: "Từ vựng an toàn trên mạng",
    basis: "English + Nghĩa + Lời nhắc",
    count: 20,
    notes: "Phục vụ chủ đề social media, privacy, cyberbullying và responsible use.",
    entries: parsePresetEntries(`
      phishing|lừa đảo qua mạng|Reminder: never click suspicious links.
      scam|trò lừa đảo|Reminder: online scams often look convincing.
      suspicious link|đường link đáng ngờ|Reminder: avoid every suspicious link.
      identity theft|đánh cắp danh tính|Reminder: identity theft can ruin finances.
      personal data|dữ liệu cá nhân|Reminder: protect your personal data carefully.
      privacy setting|cài đặt quyền riêng tư|Reminder: update privacy settings regularly.
      strong password|mật khẩu mạnh|Reminder: use a strong password for each account.
      two-factor authentication|xác thực hai lớp|Reminder: enable two-factor authentication today.
      cyberbullying|bắt nạt trên mạng|Reminder: report cyberbullying immediately.
      digital footprint|dấu vết số|Reminder: think before posting because of your digital footprint.
      anonymous account|tài khoản ẩn danh|Reminder: anonymous accounts may spread abuse.
      fake news|tin giả|Reminder: check facts before sharing fake news.
      reliable source|nguồn đáng tin|Reminder: use reliable sources for schoolwork.
      malware|mã độc|Reminder: malware can spread through downloads.
      account recovery|khôi phục tài khoản|Reminder: set recovery options early.
      privacy breach|rò rỉ quyền riêng tư|Reminder: a privacy breach can affect many users.
      online harassment|quấy rối trực tuyến|Reminder: schools should address online harassment.
      parental control|kiểm soát của phụ huynh|Reminder: parental controls help younger users.
      secure connection|kết nối an toàn|Reminder: avoid banking on insecure networks.
      public Wi-Fi|wifi công cộng|Reminder: public Wi-Fi may be unsafe.
      report button|nút báo cáo|Reminder: use the report button when necessary.
      block user|chặn người dùng|Reminder: block users who keep sending abuse.
      digital consent|sự đồng ý trên môi trường số|Reminder: ask before sharing someone's photo.
      location sharing|chia sẻ vị trí|Reminder: turn off location sharing if unnecessary.
      password manager|trình quản lý mật khẩu|Reminder: a password manager stores secure passwords.
      impersonation|mạo danh|Reminder: report any impersonation quickly.
      harmful content|nội dung độc hại|Reminder: harmful content may affect teens strongly.
      age restriction|giới hạn độ tuổi|Reminder: some platforms use age restrictions.
      private message|tin nhắn riêng|Reminder: do not trust every private message.
      username|tên người dùng|Reminder: do not reveal full identity in your username.
      online reputation|danh tiếng trực tuyến|Reminder: your online reputation matters later.
      content moderation|kiểm duyệt nội dung|Reminder: content moderation is imperfect.
      suspicious attachment|tệp đính kèm đáng ngờ|Reminder: never open suspicious attachments.
      data leak|rò rỉ dữ liệu|Reminder: a data leak can expose passwords.
      screen recording|ghi màn hình|Reminder: ask permission before screen recording.
      consent form|mẫu đồng ý|Reminder: schools may require a consent form.
      profile visibility|mức độ hiển thị hồ sơ|Reminder: review profile visibility settings.
      safe browsing|duyệt web an toàn|Reminder: safe browsing habits protect users.
      verify identity|xác minh danh tính|Reminder: platforms sometimes verify identity.
      responsible use|sử dụng có trách nhiệm|Reminder: students should learn responsible use.
    `),
  },
  {
    id: "flash-reading-verb-bank",
    topic: "Động từ hay gặp trong đọc hiểu",
    basis: "Verb + Nghĩa + Ví dụ ngắn",
    count: 27,
    notes: "Tập trung vào các động từ học thuật và reading-based questions.",
    entries: parsePresetEntries(`
      indicate|chỉ ra|Example: The graph indicates a steady rise.
      suggest|gợi ý, cho thấy|Example: The passage suggests a hidden concern.
      imply|hàm ý|Example: The writer implies that the policy failed.
      emphasize|nhấn mạnh|Example: The article emphasizes personal responsibility.
      illustrate|minh họa|Example: The final paragraph illustrates the main point.
      mention|đề cập|Example: The report mentions two possible causes.
      highlight|làm nổi bật|Example: The speaker highlighted the key benefits.
      reveal|tiết lộ, cho thấy|Example: The survey reveals student anxiety.
      demonstrate|chứng minh|Example: The experiment demonstrates the effect clearly.
      compare|so sánh|Example: The text compares city life with rural life.
      contrast|đối chiếu, làm tương phản|Example: The author contrasts old and modern values.
      support|ủng hộ, chứng minh|Example: The data supports the conclusion.
      argue|lập luận|Example: The writer argues for stricter rules.
      claim|khẳng định|Example: The company claims the product is safe.
      conclude|kết luận|Example: We can conclude that habits matter.
      identify|xác định|Example: Identify the author's tone.
      assess|đánh giá|Example: The task asks students to assess the impact.
      interpret|diễn giải|Example: Readers must interpret the chart correctly.
      infer|suy ra|Example: You can infer the answer from paragraph two.
      persuade|thuyết phục|Example: The advertisement aims to persuade teenagers.
      acknowledge|thừa nhận|Example: The article acknowledges one drawback.
      propose|đề xuất|Example: Scientists proposed a new solution.
      maintain|duy trì; khẳng định|Example: The author maintains that schools need reform.
      criticize|chỉ trích|Example: Some experts criticize excessive screen time.
      encourage|khuyến khích|Example: Campaigns encourage recycling at home.
      prevent|ngăn chặn|Example: Early action can prevent larger problems.
      reduce|giảm bớt|Example: Bike lanes reduce traffic pressure.
      promote|thúc đẩy|Example: The festival promotes local culture.
      provide|cung cấp|Example: The library provides free resources.
      affect|ảnh hưởng|Example: Climate change affects farming areas.
      improve|cải thiện|Example: Reading daily can improve vocabulary.
      replace|thay thế|Example: Online meetings cannot fully replace face-to-face talks.
      rely on|phụ thuộc vào|Example: Many students rely on digital tools.
      contribute to|góp phần vào|Example: Sleep contributes to better memory.
      result in|dẫn đến|Example: Poor planning may result in failure.
      deal with|xử lý|Example: The article deals with youth unemployment.
      stem from|bắt nguồn từ|Example: The problem stems from poor communication.
      shape|định hình|Example: Family values shape personal choices.
      transform|biến đổi|Example: Technology can transform education.
      overlook|bỏ qua|Example: Students often overlook small details.
    `),
  },
  {
    id: "flash-graph-description",
    topic: "Từ vựng mô tả biểu đồ và xu hướng",
    basis: "Word/phrase + Nghĩa + Cách dùng",
    count: 20,
    notes: "Hữu ích cho writing task, report language và phân tích dữ liệu.",
    entries: parsePresetEntries(`
      increase|tăng lên|Usage: sales increased sharply in June.
      decrease|giảm xuống|Usage: the number decreased gradually.
      remain stable|giữ ổn định|Usage: prices remained stable for months.
      fluctuate|dao động|Usage: the figures fluctuated throughout the year.
      peak|đạt đỉnh|Usage: the trend peaked in August.
      reach a low|chạm mức thấp|Usage: profits reached a low in winter.
      sharp rise|mức tăng mạnh|Usage: there was a sharp rise in demand.
      slight fall|mức giảm nhẹ|Usage: the chart shows a slight fall.
      dramatic growth|sự tăng trưởng mạnh|Usage: the company saw dramatic growth.
      gradual decline|sự suy giảm từ từ|Usage: there was a gradual decline after 2020.
      upward trend|xu hướng tăng|Usage: the graph indicates an upward trend.
      downward trend|xu hướng giảm|Usage: this line reflects a downward trend.
      account for|chiếm|Usage: online sales account for half of total revenue.
      proportion|tỷ lệ|Usage: the proportion of female students rose.
      percentage|phần trăm|Usage: the percentage reached 60 percent.
      significant difference|sự khác biệt đáng kể|Usage: there is a significant difference between the two groups.
      compared with|so với|Usage: compared with 2024, the result is higher.
      in contrast|trái lại|Usage: in contrast, rural areas saw a decline.
      respectively|theo thứ tự tương ứng|Usage: the figures were 30 and 45 respectively.
      overall|nhìn chung|Usage: overall, the trend is positive.
      approximately|xấp xỉ|Usage: approximately 200 students joined the survey.
      just over|nhỉnh hơn một chút|Usage: the figure was just over 40 percent.
      just under|nhỉnh dưới một chút|Usage: it stayed just under 30 percent.
      double|gấp đôi|Usage: the number doubled within five years.
      halve|giảm còn một nửa|Usage: the output halved after the crisis.
      level off|đi ngang, chững lại|Usage: the trend began to level off in May.
      soar|tăng vọt|Usage: house prices soared in the capital.
      plunge|lao dốc|Usage: the value plunged after the announcement.
      marginally|một chút, không đáng kể|Usage: the figure rose marginally.
      steadily|đều đặn|Usage: sales increased steadily over time.
      noticeably|rõ rệt|Usage: the gap became noticeably smaller.
      figure|con số|Usage: the figure for buses was the highest.
      category|hạng mục|Usage: the final category showed the largest gain.
      bar chart|biểu đồ cột|Usage: the bar chart compares three age groups.
      line graph|biểu đồ đường|Usage: the line graph shows changes over time.
      pie chart|biểu đồ tròn|Usage: the pie chart illustrates market share.
      data set|bộ dữ liệu|Usage: the data set covers ten years.
      compare A with B|so sánh A với B|Usage: compare urban spending with rural spending.
      stand at|đạt mức|Usage: the unemployment rate stood at 7 percent.
      witness|chứng kiến|Usage: the period witnessed rapid change.
    `),
  },
  {
    id: "flash-daily-routines",
    topic: "Từ vựng thói quen hằng ngày",
    basis: "Phrase + Nghĩa + Ví dụ",
    count: 20,
    notes: "Phù hợp cho speaking cơ bản, life skills và thói quen học tập.",
    entries: parsePresetEntries(`
      wake up early|dậy sớm|Example: I try to wake up early on weekdays.
      make the bed|dọn giường|Example: He makes the bed before breakfast.
      brush teeth|đánh răng|Example: Children should brush their teeth twice a day.
      have breakfast|ăn sáng|Example: She never skips breakfast.
      catch the bus|bắt xe buýt|Example: We catch the bus at 6:45.
      attend classes|đi học, dự lớp|Example: Students attend classes from Monday to Friday.
      do revision|ôn bài|Example: I do revision after dinner.
      take a short break|nghỉ ngắn|Example: Take a short break every forty minutes.
      scroll social media|lướt mạng xã hội|Example: Many teens scroll social media before bed.
      prepare dinner|chuẩn bị bữa tối|Example: My mother prepares dinner at six.
      wash the dishes|rửa bát|Example: I wash the dishes on alternate days.
      water the plants|tưới cây|Example: He waters the plants every morning.
      go for a walk|đi dạo|Example: My father goes for a walk after work.
      work overtime|làm thêm giờ|Example: She sometimes works overtime on Friday.
      study independently|tự học|Example: University students need to study independently.
      set an alarm|đặt báo thức|Example: I set an alarm for five thirty.
      tidy the desk|dọn gọn bàn học|Example: A tidy desk helps me focus.
      get dressed|mặc quần áo|Example: The children got dressed quickly.
      take a shower|tắm|Example: He takes a shower after exercising.
      leave for school|rời nhà đi học|Example: I leave for school at half past six.
      get back home|về nhà|Example: She gets back home at five.
      relax a little|thư giãn một chút|Example: I relax a little before doing homework.
      read before bed|đọc trước khi ngủ|Example: Reading before bed helps me sleep better.
      fall asleep|ngủ thiếp đi|Example: He fell asleep while watching TV.
      oversleep|ngủ quên|Example: I overslept and missed the bus.
      have lunch|ăn trưa|Example: We usually have lunch in the canteen.
      do housework|làm việc nhà|Example: Teenagers should help do housework.
      check messages|kiểm tra tin nhắn|Example: She checks messages after class.
      review notes|xem lại ghi chú|Example: Review notes before the quiz.
      pack the bag|soạn cặp|Example: He packs his bag the night before.
      clean the room|dọn phòng|Example: We clean the room every Saturday.
      charge the phone|sạc điện thoại|Example: Remember to charge the phone overnight.
      go to bed late|đi ngủ muộn|Example: Going to bed late affects memory.
      follow a schedule|theo lịch trình|Example: A schedule keeps students on track.
      skip a meal|bỏ bữa|Example: You should not skip a meal before class.
      turn off the lights|tắt đèn|Example: Turn off the lights when leaving.
      feed the pet|cho thú cưng ăn|Example: He feeds the pet before school.
      run errands|đi làm việc vặt|Example: My mother runs errands in the afternoon.
      stay up late|thức khuya|Example: I try not to stay up late during exam week.
      keep a diary|viết nhật ký|Example: Some students keep a diary in English.
    `),
  },
  {
    id: "flash-hobbies-arts",
    topic: "Từ vựng sở thích và nghệ thuật",
    basis: "Word + Nghĩa + Gợi ý nói",
    count: 23,
    notes: "Phù hợp cho chủ đề free time, creativity, music, movies và visual arts.",
    entries: parsePresetEntries(`
      hobby|sở thích|Speaking: My main hobby is sketching.
      pastime|trò tiêu khiển|Speaking: Reading is a peaceful pastime.
      creativity|sự sáng tạo|Speaking: Music encourages creativity.
      drawing|vẽ|Speaking: Drawing helps me relax.
      painting|hội họa|Speaking: She loves watercolor painting.
      sketch|bản phác thảo|Speaking: He showed me a quick sketch.
      sculpture|điêu khắc|Speaking: The museum has a modern sculpture section.
      exhibition|triển lãm|Speaking: We visited an art exhibition on Sunday.
      performance|buổi biểu diễn|Speaking: The performance received loud applause.
      concert|buổi hòa nhạc|Speaking: My first concert was unforgettable.
      instrument|nhạc cụ|Speaking: She plays two instruments.
      melody|giai điệu|Speaking: The melody stayed in my head all day.
      rhythm|nhịp điệu|Speaking: Dancers must follow the rhythm closely.
      lyric|lời bài hát|Speaking: I like songs with meaningful lyrics.
      audience|khán giả|Speaking: The audience loved the final song.
      director|đạo diễn|Speaking: The director won an international award.
      actor|diễn viên|Speaking: The actor delivered a powerful performance.
      documentary|phim tài liệu|Speaking: I enjoy nature documentaries.
      fiction|truyện hư cấu|Speaking: My sister prefers fiction to history books.
      photography|nhiếp ảnh|Speaking: Photography helps me notice small details.
      gallery|phòng trưng bày|Speaking: The gallery displays student artwork.
      craft|đồ thủ công, nghề thủ công|Speaking: Handmade craft items are popular at fairs.
      rehearsal|buổi tập dượt|Speaking: The band had a long rehearsal.
      stage fright|nỗi sợ sân khấu|Speaking: She overcame stage fright gradually.
      inspiration|nguồn cảm hứng|Speaking: Travel gives him artistic inspiration.
      masterpiece|kiệt tác|Speaking: Many consider it a masterpiece.
      compose|sáng tác|Speaking: He hopes to compose film music one day.
      perform live|biểu diễn trực tiếp|Speaking: They performed live at the school hall.
      edit video|chỉnh sửa video|Speaking: I learned to edit video for fun.
      collect stamps|sưu tầm tem|Speaking: My grandfather used to collect stamps.
      play board games|chơi trò chơi bàn cờ|Speaking: We play board games every weekend.
      do pottery|làm gốm|Speaking: Pottery classes are surprisingly relaxing.
      knitting|đan len|Speaking: Knitting takes patience and focus.
      creative writing|viết sáng tạo|Speaking: Creative writing improves imagination.
      folk music|nhạc dân gian|Speaking: Folk music reflects local culture.
      animation|hoạt hình|Speaking: Many children love animation.
      costume design|thiết kế trang phục|Speaking: She is interested in costume design.
      mural|tranh tường lớn|Speaking: The school painted a mural on the wall.
      calligraphy|thư pháp|Speaking: He practises calligraphy during Tet.
      art appreciation|cảm thụ nghệ thuật|Speaking: Art appreciation grows with practice.
    `),
  },
  {
    id: "flash-business-english",
    topic: "Từ vựng tiếng Anh kinh doanh cơ bản",
    basis: "Word/phrase + Nghĩa + Cụm học",
    count: 24,
    notes: "Dùng cho chủ đề economy, startup, office work và basic business reading.",
    entries: parsePresetEntries(`
      company|công ty|Phrase: a private company.
      client|khách hàng, đối tác|Phrase: meet a new client.
      manager|quản lý|Phrase: talk to the manager.
      staff|nhân sự, nhân viên|Phrase: office staff.
      department|phòng ban|Phrase: the sales department.
      meeting|cuộc họp|Phrase: hold a weekly meeting.
      profit|lợi nhuận|Phrase: make a profit.
      loss|thua lỗ|Phrase: suffer a loss.
      investment|sự đầu tư|Phrase: foreign investment.
      budget|ngân sách|Phrase: stay within budget.
      revenue|doanh thu|Phrase: annual revenue.
      expense|chi phí|Phrase: cut business expenses.
      market share|thị phần|Phrase: gain market share.
      competitor|đối thủ cạnh tranh|Phrase: major competitors.
      advertisement|quảng cáo|Phrase: launch an advertisement.
      customer service|dịch vụ khách hàng|Phrase: improve customer service.
      negotiate a deal|đàm phán thỏa thuận|Phrase: negotiate a fair deal.
      sign a contract|ký hợp đồng|Phrase: sign a long-term contract.
      startup|công ty khởi nghiệp|Phrase: build a startup.
      entrepreneur|doanh nhân|Phrase: a young entrepreneur.
      branch office|chi nhánh|Phrase: open a branch office.
      headquarters|trụ sở chính|Phrase: the company headquarters.
      supply chain|chuỗi cung ứng|Phrase: global supply chains.
      demand|nhu cầu|Phrase: growing consumer demand.
      launch a product|ra mắt sản phẩm|Phrase: launch a new product.
      target market|thị trường mục tiêu|Phrase: identify the target market.
      consumer behavior|hành vi người tiêu dùng|Phrase: study consumer behavior.
      sales figure|số liệu bán hàng|Phrase: rising sales figures.
      office culture|văn hóa công sở|Phrase: a healthy office culture.
      promotion campaign|chiến dịch khuyến mãi|Phrase: run a promotion campaign.
      productivity tool|công cụ tăng năng suất|Phrase: use productivity tools.
      business partner|đối tác kinh doanh|Phrase: trust a business partner.
      financial report|báo cáo tài chính|Phrase: read the financial report.
      shareholder|cổ đông|Phrase: satisfy shareholders.
      merger|sáp nhập|Phrase: the merger changed the market.
      expansion plan|kế hoạch mở rộng|Phrase: announce an expansion plan.
      workplace policy|chính sách nơi làm việc|Phrase: update workplace policies.
      customer loyalty|sự trung thành của khách hàng|Phrase: build customer loyalty.
      cash flow|dòng tiền|Phrase: manage cash flow carefully.
      business strategy|chiến lược kinh doanh|Phrase: revise the business strategy.
    `),
  },
  {
    id: "flash-tourism-services",
    topic: "Từ vựng dịch vụ du lịch",
    basis: "Phrase + Nghĩa + Gợi ý nghề nghiệp",
    count: 22,
    notes: "Hữu ích cho nghề du lịch, hospitality và customer service.",
    entries: parsePresetEntries(`
      front desk|quầy lễ tân|Career: The front desk handles check-in.
      room service|dịch vụ phòng|Career: Guests can order room service late at night.
      housekeeping|bộ phận buồng phòng|Career: Housekeeping keeps rooms clean.
      concierge|nhân viên hỗ trợ khách|Career: A concierge can book tickets for guests.
      porter|nhân viên khuân hành lý|Career: The porter carried the bags upstairs.
      guesthouse|nhà nghỉ|Career: Small towns often have family-run guesthouses.
      buffet breakfast|bữa sáng tự chọn|Career: The hotel offers a buffet breakfast.
      tour package|gói du lịch|Career: The agency promotes weekend tour packages.
      sightseeing bus|xe buýt tham quan|Career: We booked a sightseeing bus for the city center.
      customer complaint|khiếu nại của khách hàng|Career: Handle every customer complaint politely.
      service charge|phí dịch vụ|Career: The bill included a service charge.
      reservation desk|bàn đặt chỗ|Career: Call the reservation desk to confirm.
      tourist attraction|điểm thu hút khách du lịch|Career: The temple is a major tourist attraction.
      cultural site|di tích văn hóa|Career: Guides explain each cultural site carefully.
      sightseeing tour|chuyến tham quan|Career: The sightseeing tour starts at nine.
      local guide|hướng dẫn viên địa phương|Career: A local guide knows hidden spots.
      airport pickup|đón khách ở sân bay|Career: Airport pickup is available on request.
      check-in counter|quầy làm thủ tục|Career: Please go to check-in counter B.
      travel agency|công ty du lịch|Career: The travel agency arranged everything.
      double room|phòng đôi|Career: We reserved a double room for two nights.
      single room|phòng đơn|Career: A single room is cheaper than a suite.
      suite|phòng hạng sang|Career: The suite overlooks the sea.
      hospitality|ngành dịch vụ hiếu khách|Career: She studies hospitality at college.
      cancellation policy|chính sách hủy|Career: Read the cancellation policy first.
      tourist visa|thị thực du lịch|Career: Apply for a tourist visa online.
      overbooked|đặt quá số phòng/chỗ|Career: The hotel was overbooked last night.
      local specialty|đặc sản địa phương|Career: Tourists love trying local specialties.
      multilingual|đa ngôn ngữ|Career: Multilingual staff are highly valued.
      service quality|chất lượng dịch vụ|Career: Service quality determines customer loyalty.
      accommodation provider|đơn vị cung cấp lưu trú|Career: Compare several accommodation providers.
      package holiday|kỳ nghỉ trọn gói|Career: Package holidays suit busy families.
      hospitality industry|ngành công nghiệp dịch vụ lưu trú|Career: The hospitality industry recovered quickly.
      booking confirmation|xác nhận đặt chỗ|Career: Keep your booking confirmation email.
      itinerary change|thay đổi lịch trình|Career: Bad weather forced an itinerary change.
      service standard|tiêu chuẩn dịch vụ|Career: Staff must meet service standards.
      reception area|khu tiếp tân|Career: Please wait in the reception area.
      meal voucher|phiếu ăn|Career: Guests receive a breakfast meal voucher.
      travel brochure|tờ rơi du lịch|Career: The travel brochure lists prices clearly.
      peak-hour surcharge|phụ phí giờ cao điểm|Career: There is a peak-hour surcharge for taxis.
      destination marketing|tiếp thị điểm đến|Career: Destination marketing attracts more visitors.
    `),
  },
  {
    id: "flash-law-citizenship",
    topic: "Từ vựng pháp luật và công dân",
    basis: "Word + Nghĩa + Ghi nhớ nhanh",
    count: 20,
    notes: "Dùng cho reading social issues, law, rights and responsibilities.",
    entries: parsePresetEntries(`
      law|luật|Remember: everyone must obey the law.
      regulation|quy định|Remember: school regulations keep students safe.
      citizen|công dân|Remember: every citizen has both rights and duties.
      legal|hợp pháp|Remember: downloading pirated content is not legal.
      illegal|bất hợp pháp|Remember: illegal actions can lead to punishment.
      court|tòa án|Remember: the case was heard in court.
      judge|thẩm phán|Remember: the judge made the final decision.
      jury|bồi thẩm đoàn|Remember: the jury listened to the evidence.
      witness|nhân chứng|Remember: a witness described what happened.
      evidence|bằng chứng|Remember: the police collected evidence.
      suspect|nghi phạm|Remember: the suspect denied everything.
      arrest|bắt giữ|Remember: the police arrested the thief.
      sentence|bản án|Remember: the judge announced the sentence.
      prison|nhà tù|Remember: serious crimes may lead to prison.
      fine|tiền phạt|Remember: he paid a fine for speeding.
      offense|hành vi vi phạm|Remember: littering is a minor offense.
      rights|quyền lợi|Remember: children have basic rights.
      duty|nghĩa vụ|Remember: voting can be seen as a civic duty.
      responsibility|trách nhiệm|Remember: citizens have social responsibility.
      obey|tuân theo|Remember: obey traffic signs at all times.
      ban|lệnh cấm|Remember: the city imposed a smoking ban.
      permit|giấy phép; cho phép|Remember: you need a permit to build here.
      authority|cơ quan chức năng, thẩm quyền|Remember: report the issue to the authorities.
      constitution|hiến pháp|Remember: the constitution protects basic freedoms.
      public order|trật tự công cộng|Remember: the law helps maintain public order.
      corruption|tham nhũng|Remember: corruption damages public trust.
      justice|công lý|Remember: victims deserve justice.
      equality before the law|bình đẳng trước pháp luật|Remember: equality before the law is fundamental.
      community service|lao động công ích|Remember: some offenders must do community service.
      road safety law|luật an toàn giao thông|Remember: students should know road safety laws.
      legal system|hệ thống pháp luật|Remember: every country has a different legal system.
      complaint|đơn khiếu nại|Remember: she filed a formal complaint.
      violation|sự vi phạm|Remember: speeding is a traffic violation.
      privacy law|luật quyền riêng tư|Remember: apps must follow privacy laws.
      fair trial|phiên tòa công bằng|Remember: everyone has the right to a fair trial.
      civil duty|nghĩa vụ công dân|Remember: paying taxes is a civil duty.
      neighborhood watch|tổ dân phòng giám sát|Remember: a neighborhood watch improves safety.
      emergency number|số khẩn cấp|Remember: learn the emergency number by heart.
      safety campaign|chiến dịch an toàn|Remember: the school joined a safety campaign.
      rule of law|thượng tôn pháp luật|Remember: democracy depends on the rule of law.
    `),
  },
  {
    id: "flash-culture-festivals",
    topic: "Từ vựng văn hóa và lễ hội",
    basis: "Word/phrase + Nghĩa + Ngữ cảnh",
    count: 26,
    notes: "Phù hợp cho speaking về traditions, customs, festivals và cultural identity.",
    entries: parsePresetEntries(`
      tradition|truyền thống|Context: Family meals are a strong tradition.
      custom|phong tục|Context: Removing shoes is a common custom in some homes.
      ceremony|nghi lễ|Context: The opening ceremony was colorful.
      celebration|sự ăn mừng|Context: Tet is the biggest celebration in Vietnam.
      ancestor worship|thờ cúng tổ tiên|Context: Ancestor worship remains important in many families.
      festival|lễ hội|Context: The lantern festival attracts thousands of visitors.
      parade|diễu hành|Context: A parade moved through the city center.
      costume|trang phục|Context: Students wore traditional costumes.
      ritual|nghi thức|Context: The ritual has symbolic meaning.
      heritage|di sản|Context: Hue is famous for its cultural heritage.
      folk game|trò chơi dân gian|Context: Children played several folk games.
      procession|đám rước|Context: The procession ended at the temple gate.
      reunion|đoàn tụ|Context: The holiday is a time for reunion.
      decorate|trang trí|Context: People decorate their houses with flowers.
      offering|lễ vật|Context: Fruit is placed on the altar as an offering.
      blessing|lời chúc phúc|Context: Elders gave blessings to children.
      worship|thờ cúng|Context: Some festivals involve worship at communal houses.
      handicraft|thủ công mỹ nghệ|Context: The village is known for handicrafts.
      cuisine|ẩm thực|Context: Festival cuisine varies by region.
      lantern|đèn lồng|Context: Lanterns lit up the old town.
      performance|tiết mục biểu diễn|Context: The lion dance performance was exciting.
      dragon dance|múa rồng|Context: The dragon dance opened the event.
      fireworks|pháo hoa|Context: Fireworks marked the end of the festival.
      public holiday|ngày nghỉ lễ|Context: Tet is a major public holiday.
      preserve tradition|giữ gìn truyền thống|Context: Schools help preserve tradition.
      pass down|truyền lại|Context: Folk songs are passed down across generations.
      cultural identity|bản sắc văn hóa|Context: Ao dai symbolizes cultural identity.
      communal house|đình làng|Context: Villagers gathered at the communal house.
      sacred place|nơi linh thiêng|Context: Visitors should respect sacred places.
      incense|nhang, hương|Context: People burned incense on the altar.
      reunion dinner|bữa cơm đoàn viên|Context: Every family values the reunion dinner.
      local legend|truyền thuyết địa phương|Context: The guide told a local legend.
      symbolic meaning|ý nghĩa biểu tượng|Context: The fruit tray has symbolic meaning.
      festive atmosphere|không khí lễ hội|Context: The streets had a festive atmosphere.
      cultural exchange|giao lưu văn hóa|Context: The school event promoted cultural exchange.
      traditional craft village|làng nghề truyền thống|Context: Tourists visited a traditional craft village.
      preserve heritage|bảo tồn di sản|Context: The community works to preserve heritage.
      folk song|dân ca|Context: Her grandmother still sings folk songs.
      sacred drum|trống nghi lễ|Context: The sacred drum signaled the start.
      temple festival|lễ hội đền chùa|Context: The temple festival lasts three days.
    `),
  },
  {
    id: "flash-transport-mobility",
    topic: "Từ vựng giao thông và di chuyển",
    basis: "Word + Nghĩa + Cụm thực tế",
    count: 21,
    notes: "Dùng cho chủ đề city life, environment, daily routines và travel.",
    entries: parsePresetEntries(`
      commute|đi lại hằng ngày|Phrase: commute to school by bus.
      vehicle|phương tiện|Phrase: electric vehicles reduce emissions.
      lane|làn đường|Phrase: stay in the correct lane.
      intersection|ngã tư, giao lộ|Phrase: stop at the intersection.
      traffic light|đèn giao thông|Phrase: wait for the traffic light to turn green.
      helmet|mũ bảo hiểm|Phrase: always wear a helmet on a motorbike.
      seat belt|dây an toàn|Phrase: fasten your seat belt.
      pedestrian crossing|vạch sang đường|Phrase: use the pedestrian crossing.
      overtake|vượt xe|Phrase: do not overtake carelessly.
      speed limit|giới hạn tốc độ|Phrase: drivers must obey the speed limit.
      rush hour|giờ cao điểm|Phrase: roads are crowded in rush hour.
      public transit|phương tiện công cộng|Phrase: many cities invest in public transit.
      fare|giá vé|Phrase: bus fares increased slightly.
      station platform|sân ga|Phrase: wait on the station platform.
      ticket machine|máy bán vé|Phrase: the ticket machine accepts cards.
      bicycle rack|giá để xe đạp|Phrase: park your bike at the bicycle rack.
      road sign|biển báo giao thông|Phrase: read every road sign carefully.
      one-way street|đường một chiều|Phrase: this is a one-way street.
      traffic offense|lỗi giao thông|Phrase: using the phone while driving is a traffic offense.
      congestion charge|phí ùn tắc|Phrase: some capitals apply a congestion charge.
      driving license|bằng lái xe|Phrase: he got his driving license last year.
      roundabout|bùng binh|Phrase: take the second exit at the roundabout.
      bus stop|trạm xe buýt|Phrase: the bus stop is near the market.
      railway|đường sắt|Phrase: the railway connects north and south.
      platform ticket|vé vào sân ga|Phrase: ask if a platform ticket is needed.
      electric scooter|xe điện|Phrase: electric scooters are popular with students.
      carpool|đi chung xe|Phrase: carpooling saves money and fuel.
      fuel-efficient|tiết kiệm nhiên liệu|Phrase: a fuel-efficient car costs less to run.
      traffic signal|tín hiệu giao thông|Phrase: a broken traffic signal caused confusion.
      zebra crossing|vạch qua đường|Phrase: stop before the zebra crossing.
      road safety campaign|chiến dịch an toàn giao thông|Phrase: the school joined a road safety campaign.
      pavement|vỉa hè|Phrase: motorcycles should not use the pavement.
      underpass|đường hầm chui|Phrase: pedestrians used the underpass safely.
      flyover|cầu vượt|Phrase: the flyover reduced congestion downtown.
      commute time|thời gian đi lại|Phrase: my commute time is nearly an hour.
      travel pass|vé tháng, thẻ đi lại|Phrase: students can buy a cheaper travel pass.
      parking fee|phí gửi xe|Phrase: parking fees are high in the center.
      lane discipline|đi đúng làn|Phrase: lane discipline improves safety.
      road rage|cơn giận khi tham gia giao thông|Phrase: road rage can be dangerous.
      slow down|giảm tốc|Phrase: drivers should slow down near schools.
    `),
  },
  {
    id: "flash-body-medicine",
    topic: "Từ vựng cơ thể và y tế cơ bản",
    basis: "Word + Nghĩa + Mẹo nhớ",
    count: 20,
    notes: "Dùng cho health topics, symptoms, doctor-patient dialogue và first aid.",
    entries: parsePresetEntries(`
      heart|tim|Memory: exercise keeps the heart healthy.
      lung|phổi|Memory: smoking damages the lungs.
      brain|não|Memory: sleep helps the brain process information.
      stomach|dạ dày|Memory: spicy food can upset the stomach.
      muscle|cơ bắp|Memory: protein helps build muscle.
      joint|khớp|Memory: old people may have joint pain.
      skin|da|Memory: sunscreen protects the skin.
      throat|cổ họng|Memory: warm tea can soothe the throat.
      fever|sốt|Memory: a high fever needs medical attention.
      cough|ho|Memory: a persistent cough should be checked.
      headache|đau đầu|Memory: stress may cause headaches.
      sore throat|đau họng|Memory: I have a sore throat today.
      runny nose|sổ mũi|Memory: a runny nose is common in cold weather.
      medicine|thuốc|Memory: take the medicine after meals.
      tablet|viên thuốc|Memory: the doctor prescribed two tablets a day.
      syrup|siro thuốc|Memory: children often take cough syrup.
      bandage|băng gạc|Memory: put a bandage on the cut.
      first aid|sơ cứu|Memory: everyone should learn basic first aid.
      wound|vết thương|Memory: clean the wound gently.
      burn|vết bỏng|Memory: cool the burn with clean water.
      bruise|vết bầm|Memory: the bruise disappeared after a week.
      fracture|gãy xương|Memory: the X-ray showed a fracture.
      emergency room|phòng cấp cứu|Memory: he was taken to the emergency room.
      nurse|y tá|Memory: the nurse checked my temperature.
      surgeon|bác sĩ phẫu thuật|Memory: the surgeon explained the procedure.
      patient|bệnh nhân|Memory: the patient needs more rest.
      blood pressure|huyết áp|Memory: stress can raise blood pressure.
      pulse|mạch|Memory: the doctor checked her pulse.
      injection|mũi tiêm|Memory: some children are afraid of injections.
      medical checkup|kiểm tra sức khỏe|Memory: an annual medical checkup is useful.
      sore muscle|cơ bị đau mỏi|Memory: I have sore muscles after running.
      allergy|dị ứng|Memory: peanuts can trigger an allergy.
      symptom checker|công cụ kiểm tra triệu chứng|Memory: do not rely only on a symptom checker.
      clinic|phòng khám|Memory: there is a clinic near the school.
      recover fully|hồi phục hoàn toàn|Memory: she will recover fully soon.
      side effect|tác dụng phụ|Memory: read about possible side effects.
      dizzy|chóng mặt|Memory: I feel dizzy when I skip breakfast.
      swollen|sưng|Memory: his ankle became swollen after the fall.
      sneeze|hắt hơi|Memory: dust makes me sneeze a lot.
      prescription drug|thuốc kê đơn|Memory: some medicines are prescription drugs.
    `),
  },
  {
    id: "flash-writing-linking-ideas",
    topic: "Cụm từ nối ý trong viết luận",
    basis: "Linker/phrase + Nghĩa + Chức năng",
    count: 20,
    notes: "Giúp viết đoạn văn và bài luận mạch lạc hơn trong THPTQG.",
    entries: parsePresetEntries(`
      first of all|trước hết|Function: open the first main point.
      to begin with|để bắt đầu|Function: introduce the first idea.
      in addition|thêm vào đó|Function: add another supporting point.
      furthermore|hơn nữa|Function: make the argument stronger.
      moreover|hơn nữa|Function: add formal support.
      besides|ngoài ra|Function: add one more related point.
      however|tuy nhiên|Function: show contrast.
      nevertheless|tuy vậy|Function: contrast with a formal tone.
      on the other hand|mặt khác|Function: introduce the opposite side.
      in contrast|trái lại|Function: compare two different situations.
      for example|ví dụ|Function: provide an illustration.
      for instance|chẳng hạn|Function: introduce a specific case.
      as a result|kết quả là|Function: show consequence.
      therefore|vì vậy|Function: conclude from evidence.
      thus|do đó|Function: a concise formal result marker.
      because|bởi vì|Function: give a reason.
      since|vì|Function: provide an explanation.
      although|mặc dù|Function: concession before a main clause.
      despite|mặc dù|Function: concession before a noun phrase.
      in conclusion|kết luận lại|Function: begin the final paragraph.
      to sum up|tóm lại|Function: summarize the whole discussion.
      all in all|nhìn chung|Function: give an overall conclusion.
      in my opinion|theo tôi|Function: state a personal viewpoint.
      from my perspective|từ góc nhìn của tôi|Function: introduce personal evaluation.
      as far as I am concerned|theo quan điểm của tôi|Function: express opinion in formal writing.
      in other words|nói cách khác|Function: restate an idea clearly.
      that is why|đó là lý do vì sao|Function: explain a result more naturally.
      as well as|cũng như|Function: add parallel ideas.
      not only ... but also|không chỉ ... mà còn|Function: emphasize two related advantages.
      for this reason|vì lý do này|Function: link cause and result.
      in the long run|về lâu dài|Function: discuss long-term effects.
      by contrast|ngược lại|Function: compare opposing trends.
      to illustrate|để minh họa|Function: signal an example is coming.
      in particular|đặc biệt|Function: narrow the focus.
      in general|nói chung|Function: make a broad statement.
      above all|trên hết|Function: emphasize the most important point.
      otherwise|nếu không thì|Function: show a negative consequence.
      meanwhile|trong khi đó|Function: describe simultaneous ideas.
      similarly|tương tự|Function: compare similar points.
      as mentioned earlier|như đã đề cập trước đó|Function: refer back to a previous idea.
    `),
  },
  {
    id: "flash-exam-instructions",
    topic: "Từ vựng hướng dẫn làm bài thi",
    basis: "Instruction phrase + Nghĩa + Mẹo làm bài",
    count: 20,
    notes: "Bám sát ngôn ngữ thường gặp trong đề và hướng dẫn phòng thi.",
    entries: parsePresetEntries(`
      choose the best answer|chọn đáp án đúng nhất|Tip: read all options first.
      fill in the blank|điền vào chỗ trống|Tip: look at grammar and meaning.
      underline the error|gạch chân lỗi sai|Tip: check tense and word form.
      reorder the sentences|sắp xếp lại các câu|Tip: find the opening sentence first.
      read the passage carefully|đọc kỹ đoạn văn|Tip: skim first, then scan.
      infer the meaning|suy ra nghĩa|Tip: use context clues.
      identify the main idea|xác định ý chính|Tip: focus on topic sentences.
      support your answer|chứng minh đáp án|Tip: find evidence in the text.
      manage your time|quản lý thời gian|Tip: do not spend too long on one item.
      mark your answer sheet|tô/điền phiếu trả lời|Tip: avoid filling the wrong number.
      check your spelling|kiểm tra chính tả|Tip: especially in writing tasks.
      read all four options|đọc cả bốn phương án|Tip: traps often appear in option A.
      skip and return later|bỏ qua và quay lại sau|Tip: useful when you are stuck.
      eliminate wrong options|loại trừ phương án sai|Tip: narrow down logically.
      pay attention to keywords|chú ý từ khóa|Tip: keywords guide you to evidence.
      avoid random guessing|tránh đoán mò|Tip: guess only after eliminating.
      review your answers|xem lại đáp án|Tip: leave five minutes for review.
      keep calm|giữ bình tĩnh|Tip: panic causes careless mistakes.
      follow the instructions|làm theo hướng dẫn|Tip: many students lose points by ignoring them.
      circle the correct letter|khoanh chữ cái đúng|Tip: transfer carefully if needed.
      answer in complete sentences|trả lời bằng câu hoàn chỉnh|Tip: useful for speaking/writing tasks.
      compare your choices|so sánh các lựa chọn|Tip: similar options hide subtle differences.
      spot the distractor|nhận ra phương án gây nhiễu|Tip: distractors often repeat words from the text.
      focus on grammar clues|tập trung vào dấu hiệu ngữ pháp|Tip: check subject-verb agreement.
      note the signal words|để ý từ tín hiệu|Tip: however, because, although matter a lot.
      keep the sequence|giữ đúng thứ tự|Tip: useful in sentence ordering tasks.
      reread the stem|đọc lại đề bài|Tip: many mistakes come from misreading the stem.
      avoid leaving blanks|tránh bỏ trống|Tip: a reasonable guess is better than nothing.
      shade one answer only|chỉ tô một đáp án|Tip: multiple marks may be invalid.
      submit on time|nộp đúng giờ|Tip: stop writing when time is called.
      listen for key details|nghe các chi tiết quan trọng|Tip: names and numbers often matter.
      paraphrase the question|diễn đạt lại câu hỏi|Tip: helps in speaking sections.
      review difficult items|xem lại câu khó|Tip: fresh eyes may catch the answer.
      watch for negatives|chú ý từ phủ định|Tip: NOT and EXCEPT change the meaning.
      read the instructions twice|đọc hướng dẫn hai lần|Tip: prevents format mistakes.
      track question numbers|theo dõi số câu|Tip: do not shift answers by one line.
      proofread the paragraph|soát lại đoạn văn|Tip: check punctuation and agreement.
      answer confidently|trả lời tự tin|Tip: steady pacing improves accuracy.
      use logical order|dùng trật tự logic|Tip: especially for writing and speaking.
      stay focused until the end|giữ tập trung đến cuối|Tip: final questions still matter.
    `),
  },
  {
    id: "flash-adjectives-opinion",
    topic: "Tính từ miêu tả quan điểm và đánh giá",
    basis: "Adjective + Nghĩa + Ví dụ",
    count: 22,
    notes: "Giúp viết và nói phần opinion, review, discussion rõ hơn.",
    entries: parsePresetEntries(`
      effective|hiệu quả|Example: This method is effective for revision.
      practical|thực tế, thiết thực|Example: We need a practical solution.
      convincing|thuyết phục|Example: Her argument sounds convincing.
      unrealistic|không thực tế|Example: The plan is unrealistic for small schools.
      beneficial|có lợi|Example: Daily reading is beneficial for learners.
      harmful|có hại|Example: Too much screen time can be harmful.
      relevant|liên quan|Example: Only include relevant examples.
      essential|thiết yếu|Example: Sleep is essential before exams.
      unnecessary|không cần thiết|Example: Some details are unnecessary.
      impressive|ấn tượng|Example: His improvement is impressive.
      disappointing|đáng thất vọng|Example: The result was disappointing.
      challenging|đầy thử thách|Example: The task is challenging but useful.
      manageable|có thể xử lý được|Example: The workload feels manageable now.
      reasonable|hợp lý|Example: That is a reasonable expectation.
      questionable|đáng nghi ngờ|Example: The source looks questionable.
      inspiring|truyền cảm hứng|Example: It was an inspiring speech.
      outdated|lỗi thời|Example: Some teaching materials are outdated.
      innovative|đổi mới|Example: The project uses innovative ideas.
      reliable|đáng tin cậy|Example: We need reliable evidence.
      awkward|gượng gạo|Example: The sentence sounds awkward.
      accurate|chính xác|Example: A summary must be accurate.
      vague|mơ hồ|Example: Your thesis statement is too vague.
      dramatic|mạnh mẽ, đáng chú ý|Example: There was a dramatic change in results.
      balanced|cân bằng|Example: A balanced essay discusses both sides.
      thoughtful|sâu sắc|Example: She gave a thoughtful response.
      biased|thiên vị|Example: The report is clearly biased.
      objective|khách quan|Example: Try to stay objective in analysis.
      subjective|chủ quan|Example: Taste is often subjective.
      memorable|đáng nhớ|Example: The trip was truly memorable.
      demanding|đòi hỏi cao|Example: Medical training is demanding.
      productive|hiệu quả, năng suất|Example: Morning study sessions are more productive.
      pointless|vô nghĩa|Example: Complaining without action is pointless.
      worthwhile|đáng giá|Example: The effort is worthwhile in the long run.
      flexible|linh hoạt|Example: Online learning is more flexible.
      restrictive|gò bó, hạn chế|Example: Some rules feel too restrictive.
      sustainable|bền vững|Example: We need a sustainable habit.
      appealing|hấp dẫn|Example: The campaign is visually appealing.
      confusing|gây bối rối|Example: The wording is confusing.
      logical|hợp lý|Example: The conclusion is logical.
      persuasive|mang tính thuyết phục|Example: A persuasive essay needs clear evidence.
    `),
  },
  {
    id: "flash-speaking-functions",
    topic: "Cụm chức năng giao tiếp khi nói",
    basis: "Function phrase + Nghĩa + Cách dùng",
    count: 20,
    notes: "Phù hợp luyện speaking: nêu ý kiến, đồng ý, phản đối, hỏi lại, chuyển ý.",
    entries: parsePresetEntries(`
      In my opinion|Theo tôi|Use: state a clear personal view.
      I believe that|Tôi tin rằng|Use: introduce a thoughtful opinion.
      From my point of view|Từ góc nhìn của tôi|Use: present perspective politely.
      I totally agree|Tôi hoàn toàn đồng ý|Use: show strong agreement.
      I partly agree|Tôi đồng ý một phần|Use: accept only part of an idea.
      I do not think so|Tôi không nghĩ vậy|Use: disagree in a soft way.
      That makes sense|Điều đó hợp lý|Use: respond positively to an idea.
      I see your point|Tôi hiểu ý bạn|Use: acknowledge the other side.
      Could you repeat that?|Bạn có thể nhắc lại không?|Use: ask for repetition.
      What do you mean by ...?|Bạn có ý gì khi nói ...?|Use: ask for clarification.
      Let me think for a moment|Cho tôi nghĩ một chút|Use: buy time naturally.
      As far as I know|Theo như tôi biết|Use: give limited information carefully.
      For example|Ví dụ|Use: support a point with an illustration.
      In other words|Nói cách khác|Use: restate an idea more clearly.
      On the one hand|Một mặt|Use: discuss one side of an issue.
      On the other hand|Mặt khác|Use: contrast with the opposite side.
      To sum up|Tóm lại|Use: end your answer smoothly.
      I am not sure, but|Tôi không chắc, nhưng|Use: answer cautiously.
      That depends on|Điều đó phụ thuộc vào|Use: show a conditional answer.
      Personally, I prefer|Cá nhân tôi thích|Use: compare two choices.
      The main reason is|Lý do chính là|Use: explain your choice.
      Another point is that|Một điểm nữa là|Use: add another idea.
      It seems to me that|Tôi cảm thấy rằng|Use: soften your viewpoint.
      To be honest|Thành thật mà nói|Use: add natural spoken emphasis.
      I would say that|Tôi muốn nói rằng|Use: sound less direct and more natural.
      For me, the best option is|Với tôi, lựa chọn tốt nhất là|Use: choose among options.
      I am in favor of|Tôi ủng hộ|Use: support an option or policy.
      I am against|Tôi phản đối|Use: reject an idea politely.
      Could you give an example?|Bạn có thể cho ví dụ không?|Use: ask the other speaker to expand.
      Let us move on to|Chúng ta chuyển sang|Use: change the topic smoothly.
      Speaking of ...|Nhân nói về ...|Use: connect related ideas.
      I completely understand|Tôi hoàn toàn hiểu|Use: show empathy in conversation.
      That is a good point|Đó là một ý hay|Use: acknowledge a useful contribution.
      I would rather|Tôi muốn ... hơn|Use: express preference politely.
      In daily life|Trong cuộc sống hằng ngày|Use: connect an answer to reality.
      It is hard to say|Khó mà nói|Use: answer uncertain questions naturally.
      I have mixed feelings about|Tôi có cảm xúc lẫn lộn về|Use: show a balanced response.
      To put it simply|Nói đơn giản thì|Use: simplify a complex idea.
      The problem is that|Vấn đề là|Use: introduce a drawback.
      The benefit is that|Lợi ích là|Use: introduce an advantage.
    `),
  },
  {
    id: "flash-environment-actions",
    topic: "Cụm hành động bảo vệ môi trường",
    basis: "Action phrase + Nghĩa + Ví dụ",
    count: 20,
    notes: "Tập trung vào hành động cụ thể để nói/viết về môi trường thực tế hơn.",
    entries: parsePresetEntries(`
      sort waste|phân loại rác|Example: Students should sort waste at school.
      recycle paper|tái chế giấy|Example: The club recycles paper every month.
      reduce plastic use|giảm sử dụng nhựa|Example: We should reduce plastic use daily.
      save electricity|tiết kiệm điện|Example: Turn off fans to save electricity.
      save water|tiết kiệm nước|Example: Save water by fixing leaks quickly.
      plant trees|trồng cây|Example: The class plans to plant trees on Sunday.
      reuse containers|tái sử dụng hộp đựng|Example: Reuse containers instead of throwing them away.
      carry a reusable bottle|mang chai dùng lại|Example: Many students carry a reusable bottle now.
      use public transport|dùng giao thông công cộng|Example: We should use public transport more often.
      cycle to school|đạp xe đến trường|Example: Cycling to school cuts emissions.
      buy eco-friendly products|mua sản phẩm thân thiện môi trường|Example: Families can buy eco-friendly products.
      compost food scraps|ủ rác hữu cơ|Example: Some homes compost food scraps.
      clean up the beach|dọn rác bãi biển|Example: Volunteers cleaned up the beach yesterday.
      join a green campaign|tham gia chiến dịch xanh|Example: Students joined a green campaign online.
      raise awareness|nâng cao nhận thức|Example: Posters help raise awareness.
      protect wildlife|bảo vệ động vật hoang dã|Example: Laws should protect wildlife better.
      cut down emissions|cắt giảm khí thải|Example: Electric buses cut down emissions.
      avoid single-use items|tránh đồ dùng một lần|Example: Avoid single-use items whenever possible.
      conserve energy|bảo tồn năng lượng|Example: New bulbs help conserve energy.
      preserve forests|bảo tồn rừng|Example: Communities work to preserve forests.
      reduce food waste|giảm lãng phí thực phẩm|Example: Planning meals reduces food waste.
      walk instead of driving|đi bộ thay vì lái xe|Example: Walk instead of driving short distances.
      organize a cleanup|tổ chức dọn vệ sinh|Example: The youth union organized a cleanup.
      report illegal dumping|báo việc đổ rác trái phép|Example: Residents should report illegal dumping.
      support green policies|ủng hộ chính sách xanh|Example: Young voters often support green policies.
      donate old clothes|quyên góp quần áo cũ|Example: Donate old clothes instead of burning them.
      use less packaging|dùng ít bao bì hơn|Example: Shops should use less packaging.
      spread the message|lan tỏa thông điệp|Example: Social media can spread the message quickly.
      repair instead of replacing|sửa thay vì thay mới|Example: Repairing devices saves resources.
      choose sustainable brands|chọn thương hiệu bền vững|Example: Many buyers choose sustainable brands now.
      bring your own bag|mang túi riêng|Example: Bring your own bag when shopping.
      switch off appliances|tắt thiết bị|Example: Switch off appliances before leaving.
      avoid wasting paper|tránh lãng phí giấy|Example: Print only when necessary to avoid wasting paper.
      use solar energy|dùng năng lượng mặt trời|Example: Some houses use solar energy now.
      share unused items|chia sẻ đồ không dùng|Example: Students can share unused items online.
      protect water sources|bảo vệ nguồn nước|Example: Factories must protect water sources.
      reduce carbon footprint|giảm dấu chân carbon|Example: Small habits reduce your carbon footprint.
      promote recycling habits|thúc đẩy thói quen tái chế|Example: Schools should promote recycling habits.
      volunteer for cleanups|tình nguyện dọn vệ sinh|Example: Teenagers can volunteer for cleanups.
      educate the community|giáo dục cộng đồng|Example: Campaigns educate the community about waste.
    `),
  },
  {
    id: "flash-phrasal-verbs-advanced",
    topic: "Cụm động từ nâng cao",
    basis: "Phrasal verb + Nghĩa + Ví dụ học thuật",
    count: 28,
    notes: "Bổ sung thêm cụm động từ beyond bộ cơ bản, sát ngữ cảnh bài thi hơn.",
    entries: parsePresetEntries(`
      account for|giải thích; chiếm|Example: Poor sleep may account for low concentration.
      act on|thực hiện theo|Example: Students should act on useful feedback.
      back up|ủng hộ; sao lưu|Example: The data backs up her argument.
      boil down to|quy về|Example: Success boils down to discipline.
      branch out|mở rộng sang lĩnh vực khác|Example: The company branched out into online education.
      bring about|gây ra|Example: Technology can bring about major change.
      build up|tăng dần; tích lũy|Example: Regular reading builds up vocabulary.
      carry over|kéo dài sang; chuyển sang|Example: Stress can carry over into sleep quality.
      come by|có được|Example: Good internships are hard to come by.
      come into|nhận được; bắt đầu có|Example: She came into some useful resources.
      cut back on|cắt giảm|Example: We should cut back on unnecessary spending.
      delve into|đi sâu vào|Example: The report delves into social inequality.
      draw on|dựa vào, tận dụng|Example: Writers draw on personal experience.
      end up|cuối cùng thì|Example: He ended up choosing engineering.
      fall behind|tụt lại phía sau|Example: Weak students may fall behind quickly.
      follow through|theo đuổi đến cùng|Example: Good plans fail without follow-through.
      get across|truyền đạt|Example: The speaker got his message across clearly.
      hand out|phát ra|Example: The teacher handed out practice sheets.
      keep on|tiếp tục|Example: Keep on reading even if the text seems hard.
      lay out|trình bày rõ|Example: The writer laid out three main arguments.
      live up to|đáp ứng kỳ vọng|Example: The course lived up to expectations.
      narrow down|thu hẹp|Example: We narrowed down the options to two.
      pay off|mang lại kết quả|Example: Consistent practice pays off eventually.
      phase out|loại bỏ dần|Example: Many cities are phasing out plastic bags.
      point out|chỉ ra|Example: The article points out a key weakness.
      rule out|loại trừ|Example: Doctors ruled out a serious illness.
      set aside|dành riêng, để riêng|Example: Set aside time for revision daily.
      speak up|lên tiếng|Example: Students should speak up when they need help.
      stem from|bắt nguồn từ|Example: The issue stems from poor planning.
      stick to|bám vào, tuân thủ|Example: Stick to your study plan this week.
      sum up|tóm tắt|Example: Let me sum up the main idea.
      take over|tiếp quản|Example: Automation may take over simple tasks.
      think over|suy nghĩ kỹ|Example: Think over the consequences first.
      turn into|biến thành|Example: A hobby can turn into a career.
      weigh up|cân nhắc|Example: Students must weigh up both options.
      work through|xử lý từng bước|Example: Work through the passage carefully.
      zone in on|tập trung đúng vào|Example: Zone in on the keywords in each item.
      hold back|kìm lại|Example: Fear can hold students back.
      roll out|triển khai|Example: The school rolled out a new online system.
      phase in|áp dụng dần|Example: The new curriculum will be phased in next year.
    `),
  },
  {
    id: "flash-prefix-suffix-bank",
    topic: "Tiền tố và hậu tố thông dụng",
    basis: "Word family + Nghĩa + Dấu hiệu nhận biết",
    count: 22,
    notes: "Phục vụ word formation theo nhóm tiền tố, hậu tố và nghĩa biến đổi.",
    entries: parsePresetEntries(`
      care -> careless|bất cẩn|Signal: suffix -less often means without.
      care -> careful|cẩn thận|Signal: suffix -ful often creates adjectives.
      hope -> hopeful|đầy hy vọng|Signal: adjective for emotion or attitude.
      use -> useless|vô ích|Signal: opposite meaning through suffix -less.
      danger -> dangerous|nguy hiểm|Signal: -ous forms many adjectives.
      fame -> famous|nổi tiếng|Signal: adjective from noun with -ous.
      help -> helpful|hữu ích|Signal: adjective before a noun.
      rely -> reliable|đáng tin cậy|Signal: -able means can be trusted/used.
      comfort -> uncomfortable|không thoải mái|Signal: prefix un- makes the opposite.
      honest -> dishonest|không trung thực|Signal: prefix dis- creates opposite meaning.
      regular -> irregular|bất thường; bất quy tắc|Signal: ir- before r.
      legal -> illegal|bất hợp pháp|Signal: il- before l.
      patient -> impatient|mất kiên nhẫn|Signal: im- before p.
      possible -> impossible|không thể|Signal: im- before p/b/m.
      mature -> immature|non nớt|Signal: opposite adjective through im-.
      active -> inactive|không hoạt động|Signal: in- often marks negation.
      correct -> incorrect|không đúng|Signal: negative form for feedback.
      appear -> disappear|biến mất|Signal: dis- creates opposite action.
      understand -> misunderstanding|sự hiểu lầm|Signal: noun formed after mis- verb family.
      act -> action|hành động|Signal: -tion creates noun.
      decide -> decisive|quyết đoán|Signal: -ive forms adjective.
      revise -> revision|sự ôn tập|Signal: noun form after verb.
      create -> creativity|sự sáng tạo|Signal: -ity often forms abstract nouns.
      equal -> equality|sự bình đẳng|Signal: -ity noun from adjective.
      possible -> possibility|khả năng|Signal: noun often follows high/the/real.
      necessary -> necessity|sự cần thiết|Signal: -ity noun for concepts.
      attend -> attendant|người phục vụ/đi kèm|Signal: -ant can indicate person.
      employ -> employer|người tuyển dụng|Signal: -er often indicates person.
      teach -> teacher|giáo viên|Signal: -er for occupation.
      music -> musician|nhạc công|Signal: -ian for profession.
      politics -> politician|chính trị gia|Signal: -ian for job/title.
      child -> childhood|thời thơ ấu|Signal: -hood forms state/period noun.
      friend -> friendship|tình bạn|Signal: -ship forms relationship noun.
      wide -> widen|mở rộng|Signal: -en often forms verbs.
      short -> shorten|rút ngắn|Signal: verb after can/should.
      modern -> modernize|hiện đại hóa|Signal: -ize forms verbs.
      simple -> simplify|đơn giản hóa|Signal: -ify changes adjective into verb.
      strong -> strength|sức mạnh|Signal: irregular noun form.
      long -> length|chiều dài|Signal: noun used in measurements.
      broad -> breadth|bề rộng|Signal: another irregular noun form.
    `),
  },
  {
    id: "flash-opinion-verbs",
    topic: "Động từ nêu ý kiến và lập luận",
    basis: "Verb + Nghĩa + Cách triển khai ý",
    count: 21,
    notes: "Hữu ích cho writing discussion, agree/disagree và paragraph development.",
    entries: parsePresetEntries(`
      believe|tin rằng|Idea: use to state personal opinion.
      think|nghĩ rằng|Idea: common and flexible in speaking.
      argue|lập luận|Idea: stronger and more academic than think.
      claim|khẳng định|Idea: useful when referring to another person's view.
      suggest|gợi ý, cho thấy|Idea: can introduce a softer idea.
      propose|đề xuất|Idea: often followed by a solution.
      recommend|khuyến nghị|Idea: useful for advice-based writing.
      insist|khăng khăng, nhấn mạnh|Idea: stronger than claim.
      admit|thừa nhận|Idea: useful for concession.
      acknowledge|thừa nhận|Idea: formal concession in essays.
      emphasize|nhấn mạnh|Idea: highlight the key point.
      explain|giải thích|Idea: support the previous statement.
      justify|biện minh, chứng minh tính hợp lý|Idea: explain why an action is acceptable.
      illustrate|minh họa|Idea: introduce an example.
      compare|so sánh|Idea: connect two ideas or groups.
      contrast|đối chiếu|Idea: show differences clearly.
      outline|phác thảo|Idea: present main points briefly.
      mention|đề cập|Idea: use for minor support.
      conclude|kết luận|Idea: end the paragraph or essay.
      infer|suy ra|Idea: useful in reading response.
      observe|nhận thấy|Idea: neutral reporting verb.
      note|lưu ý, ghi nhận|Idea: short formal reporting verb.
      affirm|khẳng định lại|Idea: formal positive support.
      dispute|bác bỏ, tranh cãi|Idea: challenge an argument.
      reject|bác bỏ|Idea: stronger than disagree.
      support|ủng hộ|Idea: introduce evidence or agreement.
      oppose|phản đối|Idea: express the opposite side.
      assume|giả định|Idea: useful before testing an idea.
      estimate|ước tính|Idea: common in reports and data writing.
      predict|dự đoán|Idea: useful in future-related topics.
      point out|chỉ ra|Idea: draw attention to evidence.
      reflect|phản ánh|Idea: useful in chart or social issue writing.
      demonstrate|chứng minh|Idea: show evidence-based support.
      reveal|cho thấy, tiết lộ|Idea: useful when talking about data.
      maintain|giữ quan điểm|Idea: writers maintain a position.
      contend|cho rằng, lập luận|Idea: advanced academic verb.
      assert|quả quyết|Idea: stronger and more formal.
      advocate|ủng hộ mạnh mẽ|Idea: advocate policy change.
      challenge|thách thức, chất vấn|Idea: challenge a traditional belief.
      clarify|làm rõ|Idea: clarify a vague point.
    `),
  },
  {
    id: "flash-education-policy",
    topic: "Từ vựng giáo dục và chính sách học đường",
    basis: "Term + Nghĩa + Ngữ cảnh",
    count: 24,
    notes: "Phù hợp cho discussion về school reform, policy, curriculum, assessment.",
    entries: parsePresetEntries(`
      curriculum|chương trình học|Context: The curriculum needs regular updates.
      syllabus|đề cương môn học|Context: Students received the syllabus on day one.
      assessment|đánh giá|Context: Continuous assessment reduces exam pressure.
      grading system|hệ thống chấm điểm|Context: The grading system changed this year.
      compulsory subject|môn học bắt buộc|Context: Math is a compulsory subject.
      elective subject|môn tự chọn|Context: Art is an elective subject here.
      school reform|cải cách giáo dục|Context: The article discusses school reform.
      academic pressure|áp lực học tập|Context: Academic pressure affects mental health.
      tuition fee|học phí|Context: Many families worry about tuition fees.
      scholarship|học bổng|Context: She won a scholarship for university.
      entrance exam|kỳ thi đầu vào|Context: Students prepare hard for the entrance exam.
      standardized test|bài thi chuẩn hóa|Context: Standardized tests cannot measure everything.
      classroom management|quản lý lớp học|Context: Good classroom management saves time.
      inclusive education|giáo dục hòa nhập|Context: Inclusive education supports all learners.
      learning outcome|kết quả học tập|Context: Clear goals improve learning outcomes.
      policy maker|nhà hoạch định chính sách|Context: Policy makers should listen to teachers.
      school principal|hiệu trưởng|Context: The principal announced the new rules.
      academic year|năm học|Context: The academic year starts in September.
      dropout prevention|ngăn ngừa bỏ học|Context: The program focuses on dropout prevention.
      teacher training|đào tạo giáo viên|Context: Teacher training improves lesson quality.
      digital classroom|lớp học số|Context: A digital classroom needs stable internet.
      lifelong learning|học tập suốt đời|Context: Lifelong learning is essential today.
      performance-based|dựa trên thành tích|Context: Some schools give performance-based rewards.
      formative assessment|đánh giá thường xuyên|Context: Formative assessment gives quick feedback.
      summative assessment|đánh giá tổng kết|Context: Final exams are summative assessments.
      learning objective|mục tiêu học tập|Context: State the learning objective clearly.
      student-centered|lấy người học làm trung tâm|Context: Student-centered teaching encourages interaction.
      curriculum overload|quá tải chương trình|Context: Curriculum overload reduces deep learning.
      private tutoring|học thêm tư nhân|Context: Many students rely on private tutoring.
      academic integrity|liêm chính học thuật|Context: Cheating violates academic integrity.
      remedial class|lớp phụ đạo|Context: Weak students joined a remedial class.
      school regulation|nội quy trường học|Context: Uniforms are part of school regulations.
      literacy rate|tỉ lệ biết chữ|Context: The country has a high literacy rate.
      education reform|cải cách giáo dục|Context: Education reform takes many years.
      learning environment|môi trường học tập|Context: A safe learning environment matters.
      school counselor|cố vấn học đường|Context: The school counselor supports stressed students.
      academic performance|kết quả học tập|Context: Sleep affects academic performance.
      assessment criteria|tiêu chí đánh giá|Context: Teachers shared the assessment criteria.
      school funding|nguồn kinh phí cho trường|Context: Rural schools need better funding.
      curriculum designer|người thiết kế chương trình học|Context: Curriculum designers must think long-term.
    `),
  },
  {
    id: "flash-environment-nouns",
    topic: "Danh từ môi trường thường gặp",
    basis: "Noun + Nghĩa + Cụm phổ biến",
    count: 20,
    notes: "Bổ sung thêm bank danh từ môi trường ngoài bộ chủ đề chính.",
    entries: parsePresetEntries(`
      habitat loss|mất môi trường sống|Common: habitat loss threatens many species.
      water scarcity|khan hiếm nước|Common: water scarcity affects farming.
      air quality|chất lượng không khí|Common: poor air quality harms children.
      recycling bin|thùng tái chế|Common: put bottles in the recycling bin.
      landfill|bãi chôn lấp rác|Common: landfills produce harmful gases.
      ecosystem balance|cân bằng hệ sinh thái|Common: chemicals disturb ecosystem balance.
      conservation effort|nỗ lực bảo tồn|Common: conservation efforts need public support.
      natural resource|tài nguyên thiên nhiên|Common: forests are precious natural resources.
      environmental damage|thiệt hại môi trường|Common: oil spills cause environmental damage.
      climate crisis|khủng hoảng khí hậu|Common: young people discuss the climate crisis often.
      sea level rise|mực nước biển dâng|Common: sea level rise threatens coastal villages.
      water pollution|ô nhiễm nước|Common: factories must prevent water pollution.
      renewable source|nguồn tái tạo|Common: wind is a renewable source.
      waste disposal|xử lý rác thải|Common: waste disposal remains a challenge.
      conservation area|khu bảo tồn|Common: tourists cannot hunt in conservation areas.
      carbon emission|khí thải carbon|Common: flights create carbon emissions.
      plastic debris|mảnh vụn nhựa|Common: plastic debris harms marine life.
      renewable resource|tài nguyên tái tạo|Common: sunlight is a renewable resource.
      energy consumption|mức tiêu thụ năng lượng|Common: energy consumption rises in summer.
      fossil fuel use|việc dùng nhiên liệu hóa thạch|Common: many countries reduce fossil fuel use.
      environmental awareness|nhận thức môi trường|Common: schools build environmental awareness.
      nature reserve|khu dự trữ thiên nhiên|Common: the bird lives in a nature reserve.
      weather pattern|kiểu thời tiết|Common: weather patterns are becoming less predictable.
      conservation project|dự án bảo tồn|Common: students joined a conservation project.
      plastic packaging|bao bì nhựa|Common: supermarkets should reduce plastic packaging.
      community cleanup|buổi dọn vệ sinh cộng đồng|Common: the class joined a community cleanup.
      water treatment|xử lý nước|Common: villages need better water treatment.
      renewable technology|công nghệ tái tạo|Common: renewable technology is advancing.
      habitat restoration|khôi phục môi trường sống|Common: habitat restoration takes years.
      pollution source|nguồn gây ô nhiễm|Common: identify the main pollution source.
      green initiative|sáng kiến xanh|Common: the school launched a green initiative.
      urban heat|nhiệt đô thị|Common: trees help reduce urban heat.
      wildlife corridor|hành lang động vật hoang dã|Common: a wildlife corridor supports migration.
      environmental law|luật môi trường|Common: stronger environmental laws are needed.
      carbon tax|thuế carbon|Common: some governments consider a carbon tax.
      clean energy|năng lượng sạch|Common: clean energy reduces emissions.
      waste reduction|giảm rác thải|Common: waste reduction starts at home.
      energy saving|tiết kiệm năng lượng|Common: energy saving lowers bills too.
      storm damage|thiệt hại do bão|Common: farmers suffered storm damage.
      drought relief|cứu trợ hạn hán|Common: drought relief reached remote areas.
    `),
  },
  {
    id: "flash-communication-verbs",
    topic: "Động từ giao tiếp thường gặp",
    basis: "Verb + Nghĩa + Mẫu câu",
    count: 20,
    notes: "Hữu ích cho speaking, writing, dialogue completion và reported speech.",
    entries: parsePresetEntries(`
      greet|chào hỏi|Model: Always greet the interviewer politely.
      apologize|xin lỗi|Model: She apologized for being late.
      persuade|thuyết phục|Model: The speaker persuaded the audience with facts.
      remind|nhắc nhở|Model: Please remind me to send the email.
      encourage|khuyến khích|Model: Good teachers encourage shy students.
      complain|phàn nàn|Model: He complained about the noisy room.
      promise|hứa|Model: She promised to return the book.
      refuse|từ chối|Model: He politely refused the invitation.
      admit|thừa nhận|Model: She admitted making the mistake.
      insist|khăng khăng|Model: My father insisted on checking the plan.
      mention|đề cập|Model: The article mentions several causes.
      recommend|đề xuất, khuyên|Model: I recommend reading this book first.
      explain|giải thích|Model: Can you explain the rule again?
      clarify|làm rõ|Model: The teacher clarified the instructions.
      discuss|thảo luận|Model: We discussed the issue in pairs.
      debate|tranh luận|Model: The class debated school uniforms.
      announce|thông báo|Model: The principal announced the final results.
      suggest|gợi ý|Model: She suggested taking the train.
      whisper|thì thầm|Model: They whispered during the film.
      shout|la hét|Model: Do not shout in the library.
      respond|phản hồi|Model: Please respond as soon as possible.
      interrupt|ngắt lời|Model: It is rude to interrupt others.
      advise|khuyên|Model: The doctor advised me to rest.
      warn|cảnh báo|Model: Teachers warn students about online scams.
      describe|miêu tả|Model: Describe the picture in detail.
      introduce|giới thiệu|Model: Let me introduce our new member.
      conclude|kết luận|Model: He concluded the presentation confidently.
      emphasize|nhấn mạnh|Model: The coach emphasized teamwork.
      deny|phủ nhận|Model: The suspect denied the accusation.
      reveal|tiết lộ|Model: The report revealed unexpected data.
      state|phát biểu, nêu rõ|Model: Please state your name clearly.
      confirm|xác nhận|Model: She confirmed the booking by phone.
      negotiate|thương lượng|Model: They negotiated a better price.
      reply|trả lời|Model: He replied in a calm voice.
      report|báo cáo|Model: Witnesses reported the incident quickly.
      instruct|hướng dẫn|Model: The leaflet instructs users step by step.
      reassure|trấn an|Model: Her words reassured the children.
      object|phản đối|Model: Some parents object to the policy.
      encourage participation|khuyến khích tham gia|Model: Group games encourage participation.
      exchange ideas|trao đổi ý kiến|Model: Students exchange ideas in discussion sessions.
    `),
  },
  {
    id: "flash-common-nouns-reading",
    topic: "Danh từ học thuật hay gặp trong reading",
    basis: "Noun + Nghĩa + Gợi ý ngữ cảnh",
    count: 24,
    notes: "Tăng vốn danh từ trừu tượng, sát bài đọc và suy luận.",
    entries: parsePresetEntries(`
      issue|vấn đề|Context: environmental issue.
      challenge|thách thức|Context: face a major challenge.
      impact|tác động|Context: the impact of tourism.
      trend|xu hướng|Context: a growing trend among teens.
      concern|mối lo ngại|Context: public concern about safety.
      consequence|hậu quả|Context: long-term consequence.
      evidence|bằng chứng|Context: scientific evidence.
      factor|yếu tố|Context: a key factor in success.
      benefit|lợi ích|Context: the benefit of exercise.
      drawback|nhược điểm|Context: one major drawback.
      approach|cách tiếp cận|Context: a new learning approach.
      solution|giải pháp|Context: a practical solution.
      advantage|ưu điểm|Context: one obvious advantage.
      disadvantage|nhược điểm|Context: the main disadvantage.
      resource|nguồn tài liệu|Context: limited natural resources.
      awareness|nhận thức|Context: public awareness campaigns.
      pressure|áp lực|Context: academic pressure on students.
      priority|ưu tiên|Context: safety should be a priority.
      variety|sự đa dạng|Context: a variety of choices.
      access|quyền tiếp cận|Context: access to information.
      influence|ảnh hưởng|Context: the influence of media.
      contribution|sự đóng góp|Context: make a contribution to society.
      development|sự phát triển|Context: economic development.
      opportunity|cơ hội|Context: equal opportunity for all.
      obstacle|trở ngại|Context: remove learning obstacles.
      circumstance|hoàn cảnh|Context: under difficult circumstances.
      tendency|xu hướng|Context: a tendency to overuse phones.
      outcome|kết quả|Context: a positive learning outcome.
      motivation|động lực|Context: strong motivation to succeed.
      strategy|chiến lược|Context: an effective reading strategy.
      demand|nhu cầu|Context: rising demand for energy.
      shortage|sự thiếu hụt|Context: a shortage of clean water.
      possibility|khả năng|Context: the possibility of failure.
      requirement|yêu cầu|Context: a basic requirement.
      assumption|giả định|Context: challenge a common assumption.
      perspective|góc nhìn|Context: from another perspective.
      comparison|sự so sánh|Context: a comparison between two methods.
      recommendation|khuyến nghị|Context: make a recommendation.
      responsibility|trách nhiệm|Context: social responsibility.
      interaction|sự tương tác|Context: face-to-face interaction.
    `),
  },
  {
    id: "flash-common-adverbs",
    topic: "Trạng từ thông dụng trong đề thi",
    basis: "Adverb + Nghĩa + Vị trí dùng",
    count: 20,
    notes: "Bổ sung trạng từ mô tả cách thức, mức độ, tần suất và liên kết câu.",
    entries: parsePresetEntries(`
      carefully|một cách cẩn thận|Position: carefully read the instructions.
      gradually|dần dần|Position: the number gradually increased.
      rapidly|nhanh chóng|Position: technology is changing rapidly.
      significantly|đáng kể|Position: costs dropped significantly.
      slightly|hơi, một chút|Position: prices rose slightly.
      eventually|cuối cùng|Position: he eventually solved the puzzle.
      previously|trước đó|Position: the topic was previously ignored.
      frequently|thường xuyên|Position: she frequently uses this app.
      rarely|hiếm khi|Position: they rarely travel abroad.
      roughly|xấp xỉ|Position: roughly half the class agreed.
      largely|phần lớn|Position: success is largely due to effort.
      clearly|một cách rõ ràng|Position: the writer clearly supports the idea.
      directly|trực tiếp|Position: the policy directly affects students.
      indirectly|gián tiếp|Position: stress indirectly harms performance.
      widely|rộng rãi|Position: the idea is widely accepted.
      heavily|nặng nề; nhiều|Position: the city depends heavily on tourism.
      merely|chỉ đơn thuần|Position: it is merely a temporary solution.
      highly|rất; ở mức cao|Position: a highly effective method.
      relatively|tương đối|Position: the task is relatively easy.
      particularly|đặc biệt|Position: this point is particularly important.
      eventually|rốt cuộc|Position: they eventually reached an agreement.
      completely|hoàn toàn|Position: I completely agree with you.
      absolutely|hoàn toàn|Position: the result is absolutely clear.
      probably|có lẽ|Position: she will probably arrive late.
      definitely|chắc chắn|Position: this strategy definitely helps.
      barely|hầu như không|Position: he could barely hear the speaker.
      mainly|chủ yếu|Position: the city relies mainly on tourism.
      locally|ở địa phương|Position: the food is produced locally.
      globally|trên toàn cầu|Position: the issue matters globally.
      recently|gần đây|Position: the school recently opened a lab.
      currently|hiện tại|Position: she is currently studying abroad.
      initially|ban đầu|Position: I initially disliked the topic.
      fully|hoàn toàn|Position: students are not fully aware of the risk.
      strongly|mạnh mẽ|Position: the report strongly recommends change.
      academically|về mặt học thuật|Position: he is academically gifted.
      socially|về mặt xã hội|Position: some teens struggle socially.
      emotionally|về mặt cảm xúc|Position: the experience affected her emotionally.
      safely|một cách an toàn|Position: children should cross safely.
      seriously|nghiêm túc|Position: we should take the issue seriously.
      intentionally|cố ý|Position: he did not intentionally offend anyone.
    `),
  },
  {
    id: "flash-opposite-adjectives",
    topic: "Cặp tính từ trái nghĩa thông dụng",
    basis: "Adjective pair + Nghĩa + Gợi ý nhớ",
    count: 20,
    notes: "Hữu ích cho bài trái nghĩa, speaking và writing mô tả.",
    entries: parsePresetEntries(`
      ancient - modern|cổ xưa - hiện đại|Memory: ancient temples vs modern buildings.
      brave - cowardly|dũng cảm - hèn nhát|Memory: brave actions inspire others.
      cheap - expensive|rẻ - đắt|Memory: cheap does not always mean low quality.
      complex - simple|phức tạp - đơn giản|Memory: choose a simple solution first.
      confident - insecure|tự tin - bất an|Memory: practice turns insecure students into confident speakers.
      convenient - inconvenient|thuận tiện - bất tiện|Memory: online shopping is convenient but risky.
      creative - unoriginal|sáng tạo - thiếu sáng tạo|Memory: teachers value creative thinking.
      dangerous - safe|nguy hiểm - an toàn|Memory: helmets make roads safer.
      efficient - wasteful|hiệu quả - lãng phí|Memory: efficient habits save time.
      formal - informal|trang trọng - không trang trọng|Memory: job interviews require formal language.
      generous - mean|hào phóng - keo kiệt|Memory: generous people often help quietly.
      harmful - harmless|có hại - vô hại|Memory: some chemicals are far from harmless.
      honest - dishonest|trung thực - không trung thực|Memory: honest feedback builds trust.
      noisy - peaceful|ồn ào - yên bình|Memory: cities are noisy but villages feel peaceful.
      permanent - temporary|lâu dài - tạm thời|Memory: this is only a temporary fix.
      polite - rude|lịch sự - thô lỗ|Memory: polite requests sound better.
      reliable - unreliable|đáng tin - không đáng tin|Memory: use reliable sources.
      strict - lenient|nghiêm khắc - dễ dãi|Memory: some teachers are strict but fair.
      successful - unsuccessful|thành công - không thành công|Memory: one unsuccessful attempt is normal.
      valuable - worthless|có giá trị - vô giá trị|Memory: time is more valuable than money.
      visible - invisible|nhìn thấy - vô hình|Memory: some dangers are invisible.
      wealthy - poor|giàu - nghèo|Memory: wealthy countries still face social issues.
      willing - unwilling|sẵn lòng - không sẵn lòng|Memory: most students are willing to help.
      wide - narrow|rộng - hẹp|Memory: the wide road became narrow ahead.
      young - elderly|trẻ - cao tuổi|Memory: both young and elderly people joined.
      optimistic - pessimistic|lạc quan - bi quan|Memory: optimistic thinking supports resilience.
      logical - illogical|hợp lý - phi lý|Memory: the conclusion felt illogical.
      patient - impatient|kiên nhẫn - thiếu kiên nhẫn|Memory: patient teachers improve outcomes.
      flexible - rigid|linh hoạt - cứng nhắc|Memory: flexible schedules reduce stress.
      public - private|công cộng - riêng tư|Memory: do not share private data in public spaces.
      stable - unstable|ổn định - không ổn định|Memory: the market remained unstable.
      lively - dull|sôi động - nhàm chán|Memory: her lesson was lively, not dull.
      grateful - ungrateful|biết ơn - vô ơn|Memory: grateful students say thank you.
      ordinary - extraordinary|bình thường - phi thường|Memory: small actions can have extraordinary impact.
      broad - limited|rộng - hạn chế|Memory: broad knowledge helps in reading.
      mature - immature|trưởng thành - non nớt|Memory: mature decisions take time.
      active - passive|chủ động - thụ động|Memory: active learning is more effective.
      supportive - unsupportive|ủng hộ - không ủng hộ|Memory: supportive friends reduce pressure.
      calm - panicked|bình tĩnh - hoảng loạn|Memory: stay calm in emergencies.
      generous - selfish|hào phóng - ích kỷ|Memory: teamwork fails with selfish attitudes.
    `),
  },
  {
    id: "flash-community-volunteering",
    topic: "Từ vựng cộng đồng và tình nguyện",
    basis: "Word/phrase + Nghĩa + Ví dụ thực tế",
    count: 22,
    notes: "Phù hợp cho chủ đề volunteer work, service learning và citizenship.",
    entries: parsePresetEntries(`
      volunteer campaign|chiến dịch tình nguyện|Example: The school launched a volunteer campaign.
      community center|trung tâm cộng đồng|Example: Classes are held at the community center.
      blood donation|hiến máu|Example: Many university students joined the blood donation day.
      charity fair|hội chợ từ thiện|Example: The charity fair raised money for poor children.
      fundraiser|hoạt động gây quỹ|Example: The fundraiser lasted all weekend.
      donation box|thùng quyên góp|Example: Place old books in the donation box.
      outreach program|chương trình tiếp cận cộng đồng|Example: The outreach program supports elderly people.
      volunteer spirit|tinh thần tình nguyện|Example: Volunteer spirit grows through action.
      social contribution|đóng góp xã hội|Example: Young people want to make a social contribution.
      local resident|cư dân địa phương|Example: Local residents appreciated the cleanup.
      relief package|gói cứu trợ|Example: Relief packages were sent to the flood area.
      nursing home|viện dưỡng lão|Example: Students visited a nursing home last month.
      orphanage|trại trẻ mồ côi|Example: The club donated clothes to the orphanage.
      distribute supplies|phát nhu yếu phẩm|Example: Volunteers distributed supplies to families.
      clean-up event|sự kiện dọn vệ sinh|Example: We joined a river clean-up event.
      mentoring program|chương trình cố vấn|Example: The mentoring program helps younger students.
      civic engagement|sự tham gia công dân|Example: Volunteering builds civic engagement.
      kindness|lòng tốt|Example: Small acts of kindness matter.
      compassion|lòng trắc ẩn|Example: Compassion motivates many volunteers.
      social impact|tác động xã hội|Example: The project created real social impact.
      awareness workshop|buổi tập huấn nâng cao nhận thức|Example: They held an awareness workshop on mental health.
      emergency relief|cứu trợ khẩn cấp|Example: Emergency relief arrived within a day.
      field trip service|chuyến đi phục vụ cộng đồng|Example: Students joined a field trip service project.
      food drive|chiến dịch quyên góp thực phẩm|Example: The food drive helped hundreds of families.
      sponsor|nhà tài trợ; tài trợ|Example: A local business sponsored the event.
      support network|mạng lưới hỗ trợ|Example: Families need a stronger support network.
      public service|phục vụ cộng đồng|Example: Volunteering is a form of public service.
      outreach volunteer|tình nguyện viên tiếp cận cộng đồng|Example: Outreach volunteers visited remote areas.
      social project|dự án xã hội|Example: The group designed a social project for teens.
      helping hand|sự giúp đỡ|Example: Every helping hand counts in emergencies.
      youth union|đoàn thanh niên|Example: The youth union organized the event.
      relief donation|khoản quyên góp cứu trợ|Example: Relief donations kept arriving.
      volunteer coordinator|điều phối viên tình nguyện|Example: The volunteer coordinator assigned tasks.
      community outreach|hoạt động hướng tới cộng đồng|Example: The NGO focuses on community outreach.
      charity run|cuộc chạy gây quỹ|Example: The charity run attracted many teenagers.
      public campaign|chiến dịch cộng đồng|Example: The public campaign promoted road safety.
      shared responsibility|trách nhiệm chung|Example: Protecting the environment is a shared responsibility.
      local initiative|sáng kiến địa phương|Example: A local initiative transformed the park.
      service learning|học qua phục vụ cộng đồng|Example: Service learning connects lessons with real life.
      volunteer experience|kinh nghiệm tình nguyện|Example: Volunteer experience strengthens university applications.
    `),
  },
  {
    id: "flash-tourism-collocations",
    topic: "Collocations du lịch thường gặp",
    basis: "Collocation + Nghĩa + Ví dụ",
    count: 24,
    notes: "Phù hợp cho writing/speaking về travel và hospitality, sát cụm tự nhiên.",
    entries: parsePresetEntries(`
      book a room|đặt phòng|Example: We booked a room online.
      catch a flight|đón/chuẩn bị lên chuyến bay|Example: We left early to catch the flight.
      miss a flight|lỡ chuyến bay|Example: He missed the flight by ten minutes.
      take a tour|đi tham quan theo tour|Example: We took a city tour in the afternoon.
      travel abroad|đi du lịch nước ngoài|Example: She hopes to travel abroad after graduation.
      travel on a budget|du lịch tiết kiệm|Example: Students often travel on a budget.
      stay overnight|ở lại qua đêm|Example: We stayed overnight near the lake.
      enjoy the scenery|ngắm cảnh|Example: We stopped to enjoy the scenery.
      explore the area|khám phá khu vực|Example: Tourists explored the area on foot.
      sample local food|thử món địa phương|Example: Visitors sampled local food at the market.
      ask for directions|hỏi đường|Example: We asked for directions at the station.
      take photographs|chụp ảnh|Example: She took photographs of every landmark.
      go sightseeing|đi tham quan|Example: They went sightseeing after breakfast.
      arrive safely|đến nơi an toàn|Example: Text me when you arrive safely.
      check the schedule|xem lịch trình|Example: Always check the train schedule.
      carry-on luggage|hành lý xách tay|Example: Keep medicine in your carry-on luggage.
      peak travel season|mùa du lịch cao điểm|Example: Prices rise in peak travel season.
      tourist hotspot|điểm du lịch nổi tiếng|Example: This beach is a tourist hotspot.
      local transportation|phương tiện địa phương|Example: We used local transportation to save money.
      travel companion|bạn đồng hành du lịch|Example: A good travel companion makes the trip easier.
      guided excursion|chuyến đi tham quan có hướng dẫn|Example: The school joined a guided excursion.
      long-haul flight|chuyến bay đường dài|Example: Long-haul flights can be exhausting.
      travel document|giấy tờ du lịch|Example: Check every travel document carefully.
      scenic viewpoint|điểm ngắm cảnh|Example: The bus stopped at a scenic viewpoint.
      hotel amenities|tiện nghi khách sạn|Example: Breakfast is one of the hotel amenities.
      check-in time|giờ nhận phòng|Example: Check-in time starts at 2 p.m.
      checkout counter|quầy thanh toán/ra sân bay|Example: The queue at the checkout counter was long.
      travel delay|sự chậm trễ khi đi lại|Example: Bad weather caused major travel delays.
      package itinerary|lịch trình trọn gói|Example: The package itinerary included museum tickets.
      airport transfer|dịch vụ đưa đón sân bay|Example: Airport transfer is included in the price.
      reserve a seat|đặt chỗ ngồi|Example: We reserved seats near the window.
      visit a landmark|thăm địa danh|Example: No trip is complete without visiting the landmark.
      exchange currency|đổi ngoại tệ|Example: We exchanged currency at the airport.
      tourist information center|trung tâm thông tin du lịch|Example: Ask at the tourist information center.
      delayed departure|khởi hành bị hoãn|Example: The delayed departure frustrated everyone.
      make a reservation|đặt chỗ|Example: Please make a reservation in advance.
      backpacking trip|chuyến đi du lịch bụi|Example: They went on a backpacking trip across Asia.
      cultural experience|trải nghiệm văn hóa|Example: Homestays offer a richer cultural experience.
      holiday package|gói kỳ nghỉ|Example: The holiday package included meals.
      visa application|đơn xin thị thực|Example: Her visa application was approved quickly.
    `),
  },
  {
    id: "flash-grammar-metalanguage",
    topic: "Thuật ngữ ngữ pháp cơ bản",
    basis: "Term + Nghĩa + Công dụng",
    count: 20,
    notes: "Hữu ích cho slide, quiz ngữ pháp và hướng dẫn học sinh tự phân tích câu.",
    entries: parsePresetEntries(`
      subject|chủ ngữ|Function: the subject performs the action.
      verb|động từ|Function: the verb expresses action or state.
      object|tân ngữ|Function: the object receives the action.
      complement|bổ ngữ|Function: it completes the meaning of the clause.
      adjective|tính từ|Function: adjectives describe nouns.
      adverb|trạng từ|Function: adverbs modify verbs, adjectives or clauses.
      clause|mệnh đề|Function: a clause has a subject and a verb.
      phrase|cụm từ|Function: a phrase does not contain a full clause.
      tense|thì|Function: tense shows time reference.
      aspect|thể|Function: aspect shows completion or progress.
      passive voice|câu bị động|Function: focus on the action receiver.
      active voice|câu chủ động|Function: focus on the doer.
      relative clause|mệnh đề quan hệ|Function: give extra information about a noun.
      reduced clause|mệnh đề rút gọn|Function: shorten structures in formal writing.
      conditional sentence|câu điều kiện|Function: describe cause and result situations.
      modal verb|động từ khuyết thiếu|Function: show ability, advice or possibility.
      infinitive|động từ nguyên mẫu|Function: often follows want, need, plan.
      gerund|danh động từ|Function: often follows enjoy, avoid, suggest.
      collocation|cụm từ kết hợp tự nhiên|Function: helps answers sound native-like.
      article|mạo từ|Function: a, an and the define nouns.
      determiner|từ hạn định|Function: words like this, some, many.
      conjunction|liên từ|Function: join words, phrases or clauses.
      preposition|giới từ|Function: show relation in time/place/logic.
      pronoun|đại từ|Function: replace a noun.
      quantifier|từ chỉ lượng|Function: words like much, many, few.
      word form|dạng từ|Function: noun, verb, adjective or adverb choice.
      agreement|sự hòa hợp|Function: subject-verb agreement matters.
      comparative|so sánh hơn|Function: compare two things.
      superlative|so sánh nhất|Function: show the highest degree.
      discourse marker|từ nối diễn ngôn|Function: organize ideas clearly.
      appositive|đồng vị ngữ|Function: rename a noun.
      parallel structure|cấu trúc song song|Function: keep a sentence balanced.
      reported speech|câu tường thuật|Function: report what someone said.
      question tag|câu hỏi đuôi|Function: check or confirm information.
      inversion|đảo ngữ|Function: add emphasis or fit formal patterns.
      main clause|mệnh đề chính|Function: can stand alone.
      subordinate clause|mệnh đề phụ|Function: depends on the main clause.
      topic sentence|câu chủ đề|Function: presents the main idea in a paragraph.
      supporting detail|chi tiết hỗ trợ|Function: explain or prove the topic sentence.
      coherence|tính mạch lạc|Function: makes ideas connect smoothly.
    `),
  },
  {
    id: "flash-finance-money",
    topic: "Từ vựng tiền bạc và tài chính cá nhân",
    basis: "Word/phrase + Nghĩa + Ví dụ ngắn",
    count: 20,
    notes: "Phù hợp cho chủ đề saving money, economy, spending habits và work.",
    entries: parsePresetEntries(`
      income|thu nhập|Example: Part-time work provides extra income.
      expense|chi phí|Example: Transport is my biggest monthly expense.
      savings|tiền tiết kiệm|Example: She keeps her savings in the bank.
      deposit|tiền gửi; đặt cọc|Example: We paid a deposit for the room.
      withdrawal|rút tiền|Example: There is a daily withdrawal limit.
      budget plan|kế hoạch chi tiêu|Example: A budget plan prevents wasteful spending.
      debt|nợ|Example: Students should avoid unnecessary debt.
      loan|khoản vay|Example: He applied for an education loan.
      interest rate|lãi suất|Example: The interest rate increased this year.
      fee|phí|Example: The service fee was higher than expected.
      allowance|tiền tiêu vặt|Example: My parents give me a weekly allowance.
      afford|có đủ khả năng chi trả|Example: Many families cannot afford private lessons.
      overspend|chi tiêu quá tay|Example: It is easy to overspend online.
      bargain price|giá hời|Example: I bought the book at a bargain price.
      financial goal|mục tiêu tài chính|Example: Saving for university is my financial goal.
      emergency fund|quỹ khẩn cấp|Example: Every family should have an emergency fund.
      household budget|ngân sách gia đình|Example: Rising prices affect the household budget.
      source of income|nguồn thu nhập|Example: Farming is their main source of income.
      cashless payment|thanh toán không tiền mặt|Example: Cashless payment is common in cities.
      transaction|giao dịch|Example: The transaction was completed in seconds.
      bill payment|thanh toán hóa đơn|Example: He set up automatic bill payments.
      save money|tiết kiệm tiền|Example: Cooking at home helps save money.
      spend wisely|chi tiêu khôn ngoan|Example: Teenagers should learn to spend wisely.
      budget cut|cắt giảm ngân sách|Example: The school faced a budget cut.
      cost-effective|tiết kiệm chi phí|Example: Public transport is more cost-effective.
      financial literacy|hiểu biết tài chính|Example: Schools should teach financial literacy.
      paycheck|phiếu lương; tiền lương|Example: His first paycheck was exciting.
      charge interest|tính lãi|Example: Some banks charge high interest.
      repay a loan|trả nợ vay|Example: It took years to repay the loan.
      make ends meet|xoay xở đủ sống|Example: Many workers struggle to make ends meet.
      living expense|chi phí sinh hoạt|Example: Living expenses in big cities are high.
      shopping budget|ngân sách mua sắm|Example: I set a shopping budget before going out.
      discounted item|mặt hàng giảm giá|Example: She bought only discounted items.
      hidden cost|chi phí ẩn|Example: Online orders often include hidden costs.
      credit card bill|hóa đơn thẻ tín dụng|Example: Pay the credit card bill on time.
      cash withdrawal|rút tiền mặt|Example: Cash withdrawals can carry fees.
      financial pressure|áp lực tài chính|Example: Financial pressure affects mental health.
      long-term saving|tiết kiệm dài hạn|Example: Long-term saving requires discipline.
      monthly budget|ngân sách hằng tháng|Example: Track your monthly budget carefully.
      money management|quản lý tiền bạc|Example: Good money management starts early.
    `),
  },
  {
    id: "flash-education-technology",
    topic: "Từ vựng công nghệ trong giáo dục",
    basis: "EdTech term + Nghĩa + Ngữ cảnh",
    count: 23,
    notes: "Bám sát các bài đọc về online learning, AI in education và digital classrooms.",
    entries: parsePresetEntries(`
      online platform|nền tảng trực tuyến|Context: Students log in to the online platform daily.
      virtual classroom|lớp học ảo|Context: A virtual classroom allows flexible learning.
      learning management system|hệ thống quản lý học tập|Context: The LMS stores assignments and scores.
      digital resource|tài nguyên số|Context: Teachers share digital resources by topic.
      recorded lecture|bài giảng được ghi lại|Context: Students rewatch the recorded lecture at home.
      interactive quiz|bài kiểm tra tương tác|Context: An interactive quiz makes revision fun.
      real-time feedback|phản hồi theo thời gian thực|Context: Apps give real-time feedback after each question.
      personalized learning|học tập cá nhân hóa|Context: AI supports personalized learning paths.
      remote learning|học từ xa|Context: Remote learning became common during the pandemic.
      blended learning|học kết hợp|Context: Blended learning mixes online and face-to-face classes.
      educational app|ứng dụng giáo dục|Context: The educational app tracks vocabulary progress.
      digital assignment|bài tập số|Context: Students submit digital assignments as PDFs.
      plagiarism checker|công cụ kiểm tra đạo văn|Context: Universities use plagiarism checkers widely.
      video conference|họp/video call trực tuyến|Context: Parents joined the meeting by video conference.
      discussion forum|diễn đàn thảo luận|Context: The forum encourages peer support.
      screen sharing|chia sẻ màn hình|Context: Screen sharing helps teachers explain clearly.
      breakout room|phòng thảo luận nhỏ|Context: Students worked in breakout rooms.
      adaptive learning|học thích ứng|Context: Adaptive learning changes difficulty automatically.
      auto-graded task|bài chấm tự động|Context: Auto-graded tasks save teachers time.
      online assessment|đánh giá trực tuyến|Context: Security is important in online assessment.
      digital distraction|sự xao nhãng số|Context: Phones can create digital distraction.
      e-book|sách điện tử|Context: E-books are lighter than printed books.
      note-taking app|ứng dụng ghi chú|Context: A note-taking app keeps ideas organized.
      cloud classroom|lớp học lưu trữ đám mây|Context: Materials stay in the cloud classroom.
      assignment portal|cổng nộp bài|Context: The assignment portal closes at midnight.
      webcam|camera máy tính|Context: Students turned on their webcams for discussion.
      online etiquette|quy tắc ứng xử trực tuyến|Context: Online etiquette matters in class.
      digital whiteboard|bảng trắng số|Context: The teacher wrote on a digital whiteboard.
      AI tutor|gia sư AI|Context: An AI tutor can explain grammar instantly.
      speech recognition|nhận diện giọng nói|Context: Speech recognition helps pronunciation practice.
      online proctoring|giám sát thi trực tuyến|Context: Online proctoring raises privacy concerns.
      educational software|phần mềm giáo dục|Context: Educational software supports self-study.
      analytics dashboard|bảng phân tích dữ liệu|Context: The dashboard shows learning trends.
      digital collaboration|hợp tác số|Context: Group projects require digital collaboration.
      remote submission|nộp bài từ xa|Context: Remote submission is convenient for students.
      self-paced learning|học theo tốc độ cá nhân|Context: Self-paced learning reduces pressure.
      adaptive quiz|bài quiz thích ứng|Context: An adaptive quiz changes with your answers.
      classroom device|thiết bị trong lớp học|Context: Every classroom device needs maintenance.
      digital assessment tool|công cụ đánh giá số|Context: A digital assessment tool saves time.
      learning analytics|phân tích học tập|Context: Learning analytics can identify weak students early.
    `),
  },
  {
    id: "flash-collocations-environment",
    topic: "Collocations môi trường thường gặp",
    basis: "Collocation + Nghĩa + Ví dụ",
    count: 20,
    notes: "Bổ sung theo cụm tự nhiên để dùng trong writing và speaking.",
    entries: parsePresetEntries(`
      renewable energy source|nguồn năng lượng tái tạo|Example: Solar power is a renewable energy source.
      reduce emissions|giảm khí thải|Example: Bike lanes help reduce emissions.
      conserve water|tiết kiệm nước|Example: People should conserve water in dry seasons.
      protect biodiversity|bảo vệ đa dạng sinh học|Example: Forest laws protect biodiversity.
      tackle pollution|giải quyết ô nhiễm|Example: Cities must tackle pollution urgently.
      raise awareness|nâng cao nhận thức|Example: Schools raise awareness through projects.
      manage waste|quản lý rác thải|Example: Local authorities must manage waste properly.
      cut down trees|chặt cây|Example: Illegal companies still cut down trees.
      plant greenery|trồng thêm mảng xanh|Example: The city plans to plant greenery along roads.
      preserve habitats|bảo tồn môi trường sống|Example: Volunteers work to preserve habitats.
      recycle materials|tái chế vật liệu|Example: Factories should recycle materials more efficiently.
      protect water resources|bảo vệ nguồn nước|Example: Industry must protect water resources.
      reduce plastic consumption|giảm tiêu thụ nhựa|Example: Students can reduce plastic consumption easily.
      use clean energy|dùng năng lượng sạch|Example: Rural homes now use clean energy.
      prevent deforestation|ngăn phá rừng|Example: Governments need stronger action to prevent deforestation.
      improve air quality|cải thiện chất lượng không khí|Example: Trees improve air quality in cities.
      reduce household waste|giảm rác sinh hoạt|Example: Composting helps reduce household waste.
      promote sustainable transport|thúc đẩy giao thông bền vững|Example: New policies promote sustainable transport.
      fight climate change|chống biến đổi khí hậu|Example: Every country should help fight climate change.
      protect marine life|bảo vệ sinh vật biển|Example: Plastic bans may protect marine life.
      limit carbon output|hạn chế lượng carbon thải ra|Example: Factories must limit carbon output.
      create green spaces|tạo không gian xanh|Example: Cities need to create green spaces.
      phase out coal|loại bỏ dần than đá|Example: Some countries are phasing out coal.
      shift to renewables|chuyển sang năng lượng tái tạo|Example: The region is shifting to renewables.
      ban single-use plastics|cấm nhựa dùng một lần|Example: The law bans single-use plastics.
      restore ecosystems|khôi phục hệ sinh thái|Example: Wetland projects restore ecosystems.
      monitor air pollution|theo dõi ô nhiễm không khí|Example: Stations monitor air pollution daily.
      reduce food waste|giảm lãng phí thực phẩm|Example: Apps now help reduce food waste.
      save natural resources|tiết kiệm tài nguyên thiên nhiên|Example: Recycling saves natural resources.
      support eco-friendly habits|ủng hộ thói quen xanh|Example: Schools support eco-friendly habits.
      promote recycling programs|thúc đẩy chương trình tái chế|Example: The town promotes recycling programs.
      dispose of waste properly|xử lý rác đúng cách|Example: Residents must dispose of waste properly.
      use biodegradable packaging|dùng bao bì phân hủy sinh học|Example: Shops use biodegradable packaging now.
      preserve green areas|giữ gìn mảng xanh|Example: Urban planners preserve green areas.
      reduce energy consumption|giảm tiêu thụ năng lượng|Example: Smart devices reduce energy consumption.
      support conservation efforts|ủng hộ nỗ lực bảo tồn|Example: Donations support conservation efforts.
      protect endangered species|bảo vệ loài nguy cấp|Example: Strong laws protect endangered species.
      improve waste sorting|cải thiện phân loại rác|Example: Campaigns improve waste sorting at source.
      stop illegal hunting|ngăn săn bắt trái phép|Example: Rangers work to stop illegal hunting.
      encourage green living|khuyến khích sống xanh|Example: Social media can encourage green living.
    `),
  },
  {
    id: "flash-reading-opinion-words",
    topic: "Từ vựng quan điểm trong bài đọc",
    basis: "Word + Nghĩa + Dấu hiệu thái độ",
    count: 22,
    notes: "Hữu ích cho câu hỏi attitude, tone, purpose và inference.",
    entries: parsePresetEntries(`
      concern|mối lo ngại|Tone: often signals a negative attitude.
      optimism|sự lạc quan|Tone: shows hopeful expectation.
      skepticism|sự hoài nghi|Tone: suggests doubt about a claim.
      criticism|sự chỉ trích|Tone: often appears in argumentative texts.
      approval|sự tán thành|Tone: signals support.
      disapproval|sự không tán thành|Tone: signals objection or dislike.
      admiration|sự ngưỡng mộ|Tone: reveals strong respect.
      frustration|sự thất vọng, bực bội|Tone: suggests the writer is dissatisfied.
      hesitation|sự do dự|Tone: indicates uncertainty or caution.
      urgency|tính cấp bách|Tone: the issue needs immediate action.
      appreciation|sự trân trọng|Tone: often appears in cultural or personal texts.
      indifference|sự thờ ơ|Tone: shows lack of concern.
      enthusiasm|sự nhiệt tình|Tone: positive and energetic attitude.
      objection|sự phản đối|Tone: shows disagreement.
      caution|sự thận trọng|Tone: warns readers not to rush.
      irony|sự mỉa mai|Tone: meaning may differ from literal wording.
      sympathy|sự cảm thông|Tone: shows emotional support.
      doubt|sự nghi ngờ|Tone: often linked to weak evidence.
      praise|lời khen, sự ca ngợi|Tone: clearly positive evaluation.
      criticism of|sự chỉ trích đối với|Tone: negative stance toward something.
      preference for|sự thiên về|Tone: shows the favored option.
      resistance to|sự phản kháng đối với|Tone: reluctance to accept change.
      awareness of|nhận thức về|Tone: neutral but analytical.
      fear of|nỗi sợ về|Tone: often appears in risk-related passages.
      hope for|niềm hy vọng vào|Tone: optimistic expectation.
      support for|sự ủng hộ đối với|Tone: clear approval.
      opposition to|sự phản đối đối với|Tone: clear disagreement.
      concern about|lo ngại về|Tone: identifies the main problem.
      confidence in|niềm tin vào|Tone: trust in a person or method.
      disappointment with|thất vọng về|Tone: critical but emotional.
      uncertainty about|không chắc chắn về|Tone: no firm conclusion yet.
      belief in|niềm tin vào|Tone: strong internal conviction.
      suspicion of|nghi ngờ về|Tone: negative and doubtful.
      tension between|sự căng thẳng giữa|Tone: signals conflict.
      curiosity about|sự tò mò về|Tone: exploratory and interested.
      relief at|nhẹ nhõm vì|Tone: anxiety has passed.
      concern over|quan ngại về|Tone: formal way to state worry.
      commitment to|cam kết với|Tone: strong long-term support.
      confidence about|tự tin về|Tone: positive expectation.
      disappointment at|thất vọng về|Tone: failed expectation.
    `),
  },
  {
    id: "flash-project-work",
    topic: "Từ vựng làm dự án và thuyết trình",
    basis: "Word/phrase + Nghĩa + Gợi ý ứng dụng",
    count: 20,
    notes: "Phù hợp cho teamwork, presentation, planning và report tasks.",
    entries: parsePresetEntries(`
      brainstorm ideas|động não ý tưởng|Application: start by brainstorming ideas together.
      assign tasks|phân công nhiệm vụ|Application: the leader should assign tasks clearly.
      collect data|thu thập dữ liệu|Application: our group collected data from students.
      prepare slides|chuẩn bị slide|Application: she prepared slides for the final talk.
      rehearse the presentation|tập dượt thuyết trình|Application: rehearse the presentation twice.
      divide responsibilities|chia trách nhiệm|Application: divide responsibilities fairly.
      set a timeline|lập mốc thời gian|Application: every project needs a timeline.
      meet the deadline|đúng hạn|Application: strong planning helps meet the deadline.
      visual aid|phương tiện hỗ trợ trực quan|Application: charts are effective visual aids.
      handout|tài liệu phát tay|Application: the speaker gave the audience a handout.
      opening statement|phần mở đầu|Application: a clear opening statement attracts attention.
      main takeaway|ý chính cần nhớ|Application: repeat the main takeaway at the end.
      audience engagement|mức độ tương tác của khán giả|Application: questions increase audience engagement.
      speaking cue|từ gợi nhắc khi nói|Application: use short speaking cues, not full scripts.
      conclusion slide|slide kết luận|Application: the conclusion slide should be concise.
      time limit|giới hạn thời gian|Application: we finished within the time limit.
      eye contact|giao tiếp bằng mắt|Application: eye contact makes you sound confident.
      body language|ngôn ngữ cơ thể|Application: positive body language supports your message.
      feedback form|phiếu phản hồi|Application: the teacher used a feedback form.
      project outline|dàn ý dự án|Application: submit the project outline first.
      collaborate effectively|hợp tác hiệu quả|Application: classmates need to collaborate effectively.
      final draft|bản cuối|Application: check the final draft for errors.
      cite sources|trích nguồn|Application: always cite sources properly.
      survey response|câu trả lời khảo sát|Application: we analyzed survey responses.
      task progress|tiến độ công việc|Application: the leader monitored task progress.
      speaking role|vai trò thuyết trình|Application: each member had a speaking role.
      backup plan|kế hoạch dự phòng|Application: prepare a backup plan for technical issues.
      question-and-answer session|phần hỏi đáp|Application: the talk ended with a question-and-answer session.
      project objective|mục tiêu dự án|Application: state the project objective clearly.
      supporting evidence|bằng chứng hỗ trợ|Application: every claim needs supporting evidence.
      design layout|bố cục thiết kế|Application: improve the slide design layout.
      content accuracy|độ chính xác nội dung|Application: content accuracy matters more than decoration.
      speaking confidence|sự tự tin khi nói|Application: practice boosts speaking confidence.
      group coordination|sự phối hợp nhóm|Application: poor group coordination wastes time.
      peer evaluation|đánh giá đồng đẳng|Application: the project includes peer evaluation.
      editing process|quy trình chỉnh sửa|Application: the editing process took two days.
      project milestone|cột mốc dự án|Application: we reached the first project milestone.
      presentation flow|mạch trình bày|Application: improve the presentation flow.
      summarize findings|tóm tắt kết quả|Application: summarize findings in the final part.
      polished delivery|cách trình bày trau chuốt|Application: polished delivery impresses the audience.
    `),
  },
];

export const EXTRA_RAW_FLASH_PRESETS = ALL_EXTRA_RAW_FLASH_PRESETS.slice(0, 30);
