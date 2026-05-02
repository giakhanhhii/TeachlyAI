function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function makeQuestion(id, text, options, correctIndex, hint) {
  return { id, text, options, correctIndex, hint };
}

function buildBank(prefix, rows) {
  return rows.map((row, index) => makeQuestion(`${prefix}-${index + 1}`, row[0], row[1], row[2], row[3]));
}

function pickQuestionSet(questions, indexes) {
  const picked = (indexes || [])
    .map((index) => questions[index - 1])
    .filter(Boolean);
  return picked.length ? picked : questions.slice();
}

function buildSentenceTransformationBank() {
  const rows = [
    ["He started learning English three years ago.", ["He has learned English for three years.", "He has been learning English for three years.", "He learned English for three years.", "He was learning English for three years."], 1, "Start + thời điểm quá khứ -> hiện tại hoàn thành tiếp diễn."],
    ["No one in my class speaks English better than Lan.", ["Lan speaks English well in my class.", "Lan is the best English speaker in my class.", "Lan speaks English better than her teacher.", "Lan is one of the best English speakers in my class."], 1, "So sánh hơn với no one -> so sánh nhất."],
    ["She last saw her uncle two months ago.", ["She has seen her uncle for two months.", "She hasn't seen her uncle for two months.", "She didn't see her uncle for two months.", "She wasn't seeing her uncle for two months."], 1, "Last + quá khứ -> haven't seen for."],
    ["The test was so difficult that many students failed it.", ["It was such difficult test that many students failed it.", "It was such a difficult test that many students failed it.", "The test was difficult enough for many students to fail.", "So difficult was the test many students failed it."], 1, "So...that -> such a/an + adj + noun + that."],
    ["\"I will help you with your homework,\" Nam said to me.", ["Nam said me that he would help me with my homework.", "Nam told me that he would help me with my homework.", "Nam told that he would help me with my homework.", "Nam said to me he will help me with my homework."], 1, "Reported speech với tell + object."],
    ["Although he was tired, he finished the report on time.", ["Despite being tired, he finished the report on time.", "Despite he was tired, he finished the report on time.", "In spite of he was tired, he finished the report on time.", "Because of being tired, he finished the report on time."], 0, "Although clause -> despite + V-ing/noun."],
    ["People believe that the couple have left the country.", ["The couple are believed to have left the country.", "The couple believed to have left the country.", "It believes that the couple have left the country.", "The couple were believed leaving the country."], 0, "Passive reporting structure."],
    ["The box was too heavy for her to carry.", ["The box was so heavy that she could carry it.", "The box was not heavy enough for her to carry.", "The box was so heavy that she couldn't carry it.", "The box was such heavy that she couldn't carry it."], 2, "Too...to -> so...that...can't."],
    ["I wish I had paid more attention in class yesterday.", ["I regret not paying more attention in class yesterday.", "I regret paying more attention in class yesterday.", "I want to pay more attention in class yesterday.", "I hope I pay more attention in class yesterday."], 0, "Wish past perfect -> regret not V-ing."],
    ["The last time we visited Hue was in 2022.", ["We haven't visited Hue since 2022.", "We didn't visit Hue since 2022.", "We haven't visited Hue in 2022.", "We weren't visiting Hue since 2022."], 0, "The last time -> haven't since."],
    ["Hardly had she arrived home when it started to rain heavily.", ["No sooner had she arrived home than it started to rain heavily.", "No sooner she arrived home than it started to rain heavily.", "As soon as she arrived home, it had started to rain heavily.", "It started to rain heavily before she arrived home."], 0, "Hardly...when -> No sooner...than."],
    ["He is too young to live alone in the city.", ["He is not old enough to live alone in the city.", "He is so young that he can live alone in the city.", "He is old enough to live alone in the city.", "He is such a young boy living alone in the city."], 0, "Too...to -> not old enough to."],
    ["I haven't read such an interesting novel before.", ["This is the most interesting novel I have ever read.", "This is the more interesting novel I have ever read.", "This novel is so interesting than any other.", "Never I have read such an interesting novel before."], 0, "Hiện tại hoàn thành với superlative."],
    ["Because he didn't revise carefully, he made several basic mistakes.", ["If he revised carefully, he wouldn't make several basic mistakes.", "If he had revised carefully, he wouldn't have made several basic mistakes.", "Unless he revised carefully, he wouldn't make several basic mistakes.", "If only he revised carefully, he would not make mistakes."], 1, "Điều kiện loại 3."],
    ["\"Why don't we organise a recycling event next week?\" Mai said.", ["Mai suggested organising a recycling event the following week.", "Mai advised why we organised a recycling event the following week.", "Mai asked us organise a recycling event next week.", "Mai suggested to organise a recycling event next week."], 0, "Suggest + V-ing."],
    ["He prefers reading books to watching television.", ["He would rather watch television than read books.", "He likes watching television more than reading books.", "He would rather read books than watch television.", "He prefers watch television to read books."], 2, "Prefer A to B -> would rather A than B."],
    ["The bridge will be completed next month.", ["They will complete the bridge next month.", "They complete the bridge next month.", "They are completing the bridge next month.", "They have completed the bridge next month."], 0, "Passive -> active."],
    ["The weather was so bad that the match had to be canceled.", ["It was such bad weather that the match had to be canceled.", "It was such a bad weather that the match had to be canceled.", "The weather was too bad because the match had to be canceled.", "Because the weather was bad, so the match had to be canceled."], 0, "So + adj + nounless -> such + noun phrase."],
    ["Nobody in the group is more creative than Linh.", ["Linh is as creative as anybody in the group.", "Linh is the most creative person in the group.", "Linh is more creative than nobody in the group.", "Linh is one of the creative people in the group."], 1, "So sánh nhất."],
    ["She didn't start working here until she had finished university.", ["Only after she had finished university did she start working here.", "Not until she had finished university she started working here.", "Only after she finished university she had started working here.", "After she had finished university, she didn't start working here."], 0, "Đảo ngữ với only after."],
    ["The manager made the staff work late to finish the project.", ["The staff were made work late to finish the project.", "The staff were made to work late to finish the project.", "The manager was made the staff work late to finish the project.", "The staff made to work late to finish the project."], 1, "Make + O + V -> be made to V."],
    ["It isn't necessary for you to submit the form today.", ["You mustn't submit the form today.", "You needn't submit the form today.", "You shouldn't submit the form today.", "You don't have submit the form today."], 1, "Không cần thiết -> needn't."],
    ["She speaks too softly for everyone to hear clearly.", ["She speaks so softly that everyone can hear clearly.", "She doesn't speak softly enough for everyone to hear clearly.", "She speaks so softly that not everyone can hear clearly.", "Her voice is soft because everyone cannot hear clearly."], 2, "Too softly for everyone to hear -> not everyone can hear."],
    ["\"Don't forget to send me the file tonight,\" Anna said.", ["Anna reminded me send her the file that night.", "Anna reminded me to send her the file that night.", "Anna suggested me to send her the file tonight.", "Anna warned me sending her the file that night."], 1, "Remind + O + to V."],
    ["As soon as he finished the oral test, he called his mother.", ["No sooner had he finished the oral test than he called his mother.", "No sooner he had finished the oral test than he called his mother.", "Hardly he had finished the oral test when he called his mother.", "After he had called his mother, he finished the oral test."], 0, "As soon as -> No sooner...than."],
    ["The film was more boring than I had expected.", ["The film wasn't as boring as I had expected.", "The film was not as interesting as I had expected.", "I had expected the film to be more boring than it was.", "I had expected the film boring more than this."], 1, "More boring than expected -> not as interesting as expected."],
    ["He couldn't answer the final question because it was too difficult.", ["The final question was difficult enough for him to answer.", "The final question was so difficult that he couldn't answer it.", "It was such difficult final question that he couldn't answer it.", "Because the final question was difficult, he could answer it."], 1, "Too difficult to answer -> so difficult that he couldn't answer it."],
    ["I only realised the truth after I had read the final email.", ["Not until I had read the final email did I realise the truth.", "Not until I had read the final email I realised the truth.", "Only after I read the final email that I realised the truth.", "I realised the truth before I had read the final email."], 0, "Not until inversion."],
    ["They say that this cathedral was built in the 15th century.", ["This cathedral is said to build in the 15th century.", "This cathedral is said to have been built in the 15th century.", "This cathedral says to have been built in the 15th century.", "This cathedral was said building in the 15th century."], 1, "Passive reporting verb with past action."],
    ["She regrets not applying for the exchange programme earlier.", ["She wishes she applied for the exchange programme earlier.", "She wishes she had applied for the exchange programme earlier.", "She wishes she would apply for the exchange programme earlier.", "She wishes she has applied for the exchange programme earlier."], 1, "Regret not doing in past -> wish had done."],
    ["The lesson was so useful that every student took careful notes.", ["It was such useful lesson that every student took careful notes.", "It was such a useful lesson that every student took careful notes.", "The lesson was too useful for every student to take notes.", "Because the lesson was useful, so every student took notes."], 1, "So...that -> such a/an + noun."],
    ["He no longer works for that company.", ["He still works for that company.", "He used to work for that company.", "He has worked for that company for years.", "He stopped work for that company."], 1, "No longer works -> used to work."],
    ["Unless you finish the draft today, you won't join the final round.", ["If you don't finish the draft today, you won't join the final round.", "If you didn't finish the draft today, you wouldn't join the final round.", "If you finish the draft today, you won't join the final round.", "Provided you don't finish the draft today, you will join the final round."], 0, "Unless = if not."],
    ["They have never seen such a breathtaking waterfall before.", ["This is the first breathtaking waterfall they saw.", "This is the most breathtaking waterfall they have ever seen.", "This waterfall is more breathtaking than before.", "Never before they have seen such a breathtaking waterfall."], 1, "Have never seen such... -> superlative."],
    ["People think that she was forced to resign.", ["She is thought to be forced to resign.", "She is thought to have been forced to resign.", "She thinks to have been forced to resign.", "She thought to be forced to resign."], 1, "Past passive reporting structure."],
    ["He had barely sat down when the teacher asked him a question.", ["No sooner did he sit down than the teacher asked him a question.", "Hardly had he sat down when the teacher asked him a question.", "Only after he sat down the teacher asked him a question.", "When the teacher asked him a question, he had sat down barely."], 1, "Barely...when pattern."],
    ["The factory is going to increase production next quarter.", ["Production is going to be increased next quarter.", "Production is going to increase next quarter.", "Production is increasing by the factory next quarter.", "Production is going increased next quarter."], 0, "Be going to passive."],
    ["She was the only student who solved the problem without help.", ["No student solved the problem without help except her.", "She solved the problem without help more than any student.", "Only she and other students solved the problem without help.", "Without help, the problem was solved by every student."], 0, "Only student -> no one else except her."],
    ["Because he lived far from school, he had to get up very early.", ["If he doesn't live far from school, he won't have to get up early.", "If he had lived far from school, he would have got up very early.", "If he hadn't lived far from school, he wouldn't have had to get up so early.", "Unless he lived far from school, he would have got up early."], 2, "Điều kiện loại 3 với nguyên nhân quá khứ."],
    ["\"You should revise the vocabulary list again,\" the teacher told us.", ["The teacher suggested us revising the vocabulary list again.", "The teacher advised us to revise the vocabulary list again.", "The teacher told us should revise the vocabulary list again.", "The teacher warned us revise the vocabulary list again."], 1, "Advise + object + to V."],
  ];
  return buildBank("sentence-transformation", rows.map((row) => [
    `Choose the sentence that is closest in meaning to: ${row[0]}`,
    row[1],
    row[2],
    row[3],
  ]));
}

function buildErrorIdentificationBank() {
  const rows = [
    ["Find the mistake: Neither the principal nor the teachers **was** prepared for the sudden inspection.", ["Neither", "nor", "was", "prepared"], 2, "Động từ hòa hợp với danh từ gần nhất: teachers -> were."],
    ["Find the mistake: Each of the students **have** submitted the online form on time.", ["Each", "have", "submitted", "on time"], 1, "Each of + plural noun -> động từ số ít."],
    ["Find the mistake: The number of applicants **are** increasing rapidly this year.", ["number", "are", "increasing", "this year"], 1, "The number of + plural noun -> động từ số ít."],
    ["Find the mistake: The committee **have** made its final decision.", ["committee", "have", "made", "its"], 1, "Trong ngữ cảnh này committee đi với has."],
    ["Find the mistake: One of my closest friends **live** near the old railway station.", ["One of", "closest", "live", "railway"], 2, "One of + plural noun -> động từ số ít."],
    ["Find the mistake: Every teacher and student in the hall **were** asked to remain seated.", ["Every", "student", "were", "remain"], 2, "Every teacher and student -> động từ số ít."],
    ["Find the mistake: A large amount of information **were** posted on the school website.", ["amount", "information", "were", "posted"], 2, "Information là danh từ không đếm được."],
    ["Find the mistake: Physics **are** my strongest subject this semester.", ["Physics", "are", "strongest", "semester"], 1, "Tên môn học thường chia số ít."],
    ["Find the mistake: There **is** many reasons for choosing blended learning.", ["There", "is", "many", "choosing"], 1, "There are + plural noun."],
    ["Find the mistake: Not only the students but also the coach **were** disappointed.", ["Not only", "students", "were", "disappointed"], 2, "Động từ hòa hợp với coach -> was."],
    ["Find the mistake: By the time the guests arrived, the host **prepares** everything.", ["By the time", "arrived", "prepares", "everything"], 2, "Hành động xảy ra trước quá khứ -> had prepared."],
    ["Find the mistake: She said she **will finish** the report before Friday.", ["said", "will finish", "report", "before Friday"], 1, "Lùi thì trong câu tường thuật -> would finish."],
    ["Find the mistake: I **am knowing** this song because my sister plays it every day.", ["am knowing", "this song", "because", "every day"], 0, "Know không dùng tiếp diễn trong nghĩa trạng thái."],
    ["Find the mistake: If he had listened more carefully, he **won't make** that mistake.", ["If", "had listened", "won't make", "mistake"], 2, "Điều kiện loại 3 -> wouldn't have made."],
    ["Find the mistake: When I came home, my brother **has cooked** dinner already.", ["came", "has cooked", "dinner", "already"], 1, "Quá khứ hoàn thành: had cooked."],
    ["Find the mistake: This time next week, we **travel** to Hue for the exchange programme.", ["This time", "next week", "travel", "exchange"], 2, "Tương lai tiếp diễn: will be travelling."],
    ["Find the mistake: Hardly had she sat down when the phone **rings** again.", ["Hardly", "sat down", "rings", "again"], 2, "Hardly...when trong quá khứ -> rang."],
    ["Find the mistake: The students wish they **know** the answer to that final question.", ["students", "wish", "know", "final"], 2, "Wish trái hiện tại -> knew."],
    ["Find the mistake: He usually **is going** to school by bus, but today he walks.", ["usually", "is going", "by bus", "today"], 1, "Thói quen -> goes."],
    ["Find the mistake: Since the new lab opened, more students **joined** the robotics club.", ["Since", "opened", "joined", "robotics"], 2, "Since + mốc quá khứ -> have joined."],
    ["Find the mistake: The lecture was so **interest** that everyone took notes carefully.", ["lecture", "interest", "everyone", "carefully"], 1, "Tính từ mô tả vật -> interesting."],
    ["Find the mistake: She gave me some very **usefully** advice before the interview.", ["gave", "some", "usefully", "advice"], 2, "Cần tính từ useful bổ nghĩa advice."],
    ["Find the mistake: We were impressed by the **profession** way she handled the complaint.", ["impressed", "profession", "handled", "complaint"], 1, "Cần tính từ professional."],
    ["Find the mistake: His explanation was much more **convince** than I had expected.", ["explanation", "more", "convince", "expected"], 2, "Cần tính từ convincing."],
    ["Find the mistake: The manager spoke **confident** during the meeting with investors.", ["manager", "spoke", "confident", "meeting"], 2, "Cần trạng từ confidently."],
    ["Find the mistake: Their proposal seems both practical and **affordably**.", ["proposal", "practical", "affordably", "seems"], 2, "Both ... and -> song song tính từ: affordable."],
    ["Find the mistake: Modern cities need **effect** solutions to traffic congestion.", ["Modern", "effect", "solutions", "congestion"], 1, "Cần tính từ effective."],
    ["Find the mistake: Her final answer was completely **logic** and easy to follow.", ["final", "completely", "logic", "follow"], 2, "Cần tính từ logical."],
    ["Find the mistake: We were surprised at the **warmly** welcome from the host family.", ["surprised", "warmly", "welcome", "host"], 1, "Cần tính từ warm bổ nghĩa welcome."],
    ["Find the mistake: The scientist made an **importance** discovery in renewable energy.", ["scientist", "importance", "discovery", "renewable"], 1, "Cần tính từ important."],
    ["Find the mistake: She enjoys **to read**, listening to podcasts, and playing chess at weekends.", ["enjoys", "to read", "listening", "playing"], 1, "Sau enjoys dùng V-ing để song song."],
    ["Find the mistake: The brochure is designed to inform visitors, encourage them to explore, and **buying** local products.", ["designed", "inform", "encourage", "buying"], 3, "Song song với inform, encourage -> buy."],
    ["Find the mistake: He is not only intelligent **but also works** very hard.", ["not only", "intelligent", "but also works", "very hard"], 2, "Cần song song: but also hardworking / but also hard-working."],
    ["Find the mistake: Students can revise vocabulary by making flashcards, using quizzes, and **to review** notes aloud.", ["revise", "making", "using", "to review"], 3, "Song song V-ing -> reviewing."],
    ["Find the mistake: The job requires patience, accuracy, and **to communicate** clearly.", ["requires", "patience", "accuracy", "to communicate"], 3, "Danh từ song song: clear communication / communicating clearly."],
    ["Find the mistake: She promised to arrive early, to set up the room, and **checking** the sound system.", ["promised", "to arrive", "to set up", "checking"], 3, "Song song nguyên mẫu có to -> to check."],
    ["Find the mistake: The article is concise, informative, and **explains** the issue well.", ["concise", "informative", "explains", "well"], 2, "Song song tính từ -> explanatory / clear."],
    ["Find the mistake: We need people who can analyse data, solve problems, and **creative** innovative ideas.", ["analyse", "solve", "creative", "innovative"], 2, "Cần động từ create."],
    ["Find the mistake: The speaker started with a question, gave two examples, and **then a short summary**.", ["started", "gave", "then a short summary", "question"], 2, "Song song về cấu trúc động từ -> then gave a short summary."],
    ["Find the mistake: The app helps users track habits, set goals, and **their progress can be shared** with friends.", ["helps", "track", "set", "their progress can be shared"], 3, "Mất song song; cần share their progress."],
  ];
  return buildBank("error-identification", rows);
}

function buildTensesBank() {
  const rows = [
    ["She _______ in the library every Saturday morning.", ["studies", "is studying", "has studied", "studied"], 0, "Thói quen ở hiện tại đơn."],
    ["Look! The children _______ in the rain again.", ["play", "played", "are playing", "have played"], 2, "Dấu hiệu Look! -> hiện tại tiếp diễn."],
    ["I _______ this laptop since the beginning of last semester.", ["use", "used", "have used", "am using"], 2, "Since + mốc thời gian -> hiện tại hoàn thành."],
    ["By the time we got to the cinema, the film _______.", ["starts", "had started", "has started", "was starting"], 1, "Quá khứ hoàn thành."],
    ["At 8 p.m. tonight, they _______ the final rehearsal.", ["will have", "will be having", "have", "are having"], 1, "Mốc cụ thể trong tương lai -> tương lai tiếp diễn."],
    ["If she had taken the earlier bus, she _______ late for class.", ["wouldn't be", "won't be", "isn't", "wasn't"], 0, "Điều kiện hỗn hợp."],
    ["He usually drinks coffee, but today he _______ green tea.", ["chooses", "is choosing", "has chosen", "chose"], 1, "Đối lập thói quen và tình huống hiện tại."],
    ["The students _______ their essays before the teacher collected them.", ["finish", "had finished", "have finished", "were finishing"], 1, "Hành động hoàn tất trước quá khứ khác."],
    ["This time next month, I _______ for the school debate team.", ["will train", "will be training", "train", "trained"], 1, "Future continuous."],
    ["She _______ as an intern here for two months, and she still enjoys it.", ["works", "worked", "has been working", "is working"], 2, "Hiện tại hoàn thành tiếp diễn."],
    ["When we were young, we _______ to the beach every summer.", ["go", "went", "have gone", "were going"], 1, "Thói quen trong quá khứ."],
    ["I can't join you now because I _______ for tomorrow's presentation.", ["prepare", "prepared", "am preparing", "have prepared"], 2, "Lý do ở hiện tại -> tiếp diễn."],
    ["Before Lan moved to Ho Chi Minh City, she _______ in Da Nang for ten years.", ["lived", "had lived", "has lived", "was living"], 1, "Quá khứ hoàn thành với khoảng thời gian trước mốc quá khứ."],
    ["The school bus _______ at 6:30 every weekday.", ["leaves", "is leaving", "has left", "left"], 0, "Lịch trình cố định -> hiện tại đơn."],
    ["By June, my brother _______ all the entrance exams.", ["will finish", "will have finished", "finishes", "is finishing"], 1, "By + mốc tương lai -> future perfect."],
    ["If it rains this afternoon, we _______ the match indoors.", ["move", "moved", "will move", "would move"], 2, "Điều kiện loại 1."],
    ["She wishes she _______ more time to practise speaking every day.", ["has", "had", "would have", "having"], 1, "Wish trái hiện tại -> quá khứ đơn."],
    ["I _______ my keys, so I can't open the gate.", ["lose", "lost", "have lost", "had lost"], 2, "Kết quả còn ở hiện tại -> hiện tại hoàn thành."],
    ["While the lecturer _______, several students were taking notes.", ["spoke", "was speaking", "has spoken", "had spoken"], 1, "While + past continuous."],
    ["The internet connection _______ twice since this online lesson began.", ["drops", "dropped", "has dropped", "had dropped"], 2, "Since + mốc hiện tại -> present perfect."],
    ["Not until I checked the timetable _______ that the room had changed.", ["did I realise", "I realised", "had I realised", "do I realise"], 0, "Đảo ngữ với Not until."],
    ["My father _______ in Singapore for work next week.", ["travels", "is travelling", "travelled", "has travelled"], 1, "Kế hoạch tương lai gần."],
    ["No sooner _______ the answer than the bell rang.", ["she had written", "had she written", "she wrote", "did she write"], 1, "No sooner + had + S + V3."],
    ["He said he _______ the report before the manager arrived.", ["would send", "had sent", "sent", "has sent"], 1, "Lùi thì và quan hệ trước-sau trong quá khứ."],
    ["At this rate, the team _______ the target by the end of the week.", ["meets", "will have met", "met", "has met"], 1, "Future perfect."],
    ["I didn't recognise her because I _______ her for years.", ["didn't see", "hadn't seen", "haven't seen", "wasn't seeing"], 1, "Quá khứ hoàn thành phủ định."],
    ["The museum _______ at 9 a.m., so we should leave early.", ["opens", "is opening", "opened", "has opened"], 0, "Giờ mở cửa theo lịch."],
    ["Right now, the technicians _______ the sound system in the hall.", ["test", "are testing", "tested", "have tested"], 1, "Right now -> hiện tại tiếp diễn."],
    ["If she _______ more carefully, she would not have made that error.", ["reads", "had read", "read", "would read"], 1, "Điều kiện loại 3."],
    ["He _______ French for years before he moved to Canada.", ["studied", "had studied", "has studied", "was studying"], 1, "Past perfect with duration."],
    ["How long _______ for the national team?", ["do you train", "have you trained", "are you training", "did you train"], 1, "How long + present perfect."],
    ["The principal _______ the award ceremony at the moment.", ["is opening", "opens", "has opened", "opened"], 0, "At the moment -> present continuous."],
    ["After she _______ the scholarship, she called her parents immediately.", ["wins", "had won", "won", "has won"], 2, "Hai hành động nối tiếp trong quá khứ đơn."],
    ["We _______ dinner when the power went out.", ["had", "were having", "have had", "are having"], 1, "Quá khứ tiếp diễn + when."],
    ["She promised that she _______ me as soon as she arrived.", ["phones", "will phone", "would phone", "has phoned"], 2, "Lùi thì would."],
    ["By the end of this course, students _______ all the key grammar points.", ["master", "will master", "will have mastered", "have mastered"], 2, "Future perfect."],
    ["The athlete _______ harder these days because the final round is approaching.", ["trains", "is training", "has trained", "trained"], 1, "These days -> xu hướng hiện tại."],
    ["It is the first time I _______ such a persuasive argument.", ["hear", "heard", "have heard", "had heard"], 2, "It is the first time + present perfect."],
    ["If only I _______ the answer during the interview yesterday.", ["knew", "had known", "have known", "know"], 1, "If only trái quá khứ -> past perfect."],
    ["As soon as the rain stops, we _______ the field trip.", ["resume", "will resume", "resumed", "would resume"], 1, "Mệnh đề thời gian với tương lai."],
  ];
  return buildBank("tenses-verb-forms", rows);
}

function buildRelativeClausesBank() {
  const rows = [
    ["The student _______ won the science prize is my cousin.", ["who", "whom", "which", "whose"], 0, "Who làm chủ ngữ chỉ người."],
    ["The laptop _______ I bought last week is already on sale.", ["who", "which", "whose", "where"], 1, "Which làm tân ngữ chỉ vật."],
    ["The teacher with _______ I discussed the project was very supportive.", ["who", "which", "whom", "whose"], 2, "Sau giới từ dùng whom."],
    ["The town _______ my grandparents were born is now a tourist site.", ["which", "where", "whose", "who"], 1, "Where thay cho in which."],
    ["The year _______ we graduated was unforgettable.", ["which", "where", "when", "whose"], 2, "When thay cho in which."],
    ["The girl _______ brother won the scholarship is my neighbour.", ["who", "whom", "whose", "which"], 2, "Whose chỉ sở hữu."],
    ["The book _______ cover is torn belongs to the library.", ["which", "whose", "that", "where"], 1, "Whose cover."],
    ["The volunteers, _______ arrived early, organised the seats quickly.", ["who", "whom", "which", "whose"], 0, "Mệnh đề không xác định với who."],
    ["My bicycle, _______ I use every day, was a gift from my uncle.", ["who", "which", "where", "that"], 1, "Dấu phẩy -> which."],
    ["The singer _______ songs inspired many teenagers visited our school.", ["whose", "who", "whom", "which"], 0, "Whose songs."],
    ["The man _______ daughter studies abroad is the new principal.", ["who", "whose", "which", "whom"], 1, "Whose + noun."],
    ["Students _______ want extra practice can join the evening class.", ["whose", "whom", "who", "where"], 2, "Who làm chủ ngữ."],
    ["The house _______ we stayed during the camp was quite old.", ["when", "which", "where", "whose"], 2, "Where cho địa điểm."],
    ["The reason _______ she left early was understandable.", ["which", "why", "where", "who"], 1, "Reason why."],
    ["The article from _______ I learned that fact has been updated.", ["who", "whom", "which", "whose"], 2, "Sau giới từ from dùng which cho vật."],
    ["The woman _______ we met at the conference is a robotics engineer.", ["who", "whom", "whose", "where"], 1, "Whom làm tân ngữ chỉ người."],
    ["The museum _______ entrance is free on Sundays attracts many students.", ["which", "whose", "where", "that"], 1, "Whose entrance."],
    ["The app _______ helps me organise deadlines is very simple to use.", ["where", "which", "whose", "whom"], 1, "Which làm chủ ngữ chỉ vật."],
    ["The day _______ the final exam takes place is drawing near.", ["where", "when", "which", "whose"], 1, "When cho thời gian."],
    ["The professor, to _______ the letter was addressed, was abroad.", ["who", "whom", "which", "that"], 1, "Sau giới từ to dùng whom."],
    ["The students _______ in the hall are waiting for the interview.", ["stand", "standing", "stood", "to stand"], 1, "Rút gọn mệnh đề quan hệ chủ động bằng V-ing."],
    ["The documents _______ by the assistant have been uploaded.", ["prepare", "preparing", "prepared", "to prepare"], 2, "Rút gọn bị động bằng V3."],
    ["The woman _______ at the front desk is my aunt.", ["works", "working", "worked", "to work"], 1, "Relative clause reduction."],
    ["The houses _______ in this area are designed to save energy.", ["build", "built", "building", "to build"], 1, "Bị động -> built."],
    ["Passengers _______ for Flight 26 should proceed to Gate 4.", ["wait", "waiting", "waited", "to wait"], 1, "Reduced clause in notices."],
    ["The ideas _______ in her report were highly practical.", ["present", "presenting", "presented", "to present"], 2, "Passive reduction."],
    ["Anyone _______ to join the exchange trip must register today.", ["wants", "wanting", "wanted", "to want"], 1, "Anyone wanting to join..."],
    ["The athletes _______ for the final round are warming up outside.", ["select", "selected", "selecting", "to select"], 1, "Selected = who were selected."],
    ["The girl _______ next to the window is the team captain.", ["sit", "sitting", "sat", "to sit"], 1, "Sitting = who is sitting."],
    ["The products _______ from recycled materials sold out quickly.", ["make", "made", "making", "to make"], 1, "Made = which were made."],
    ["The lecture hall _______ we first met is being renovated.", ["which", "where", "whose", "when"], 1, "Where cho địa điểm."],
    ["That is the teacher _______ lessons always motivate us.", ["who", "whose", "whom", "which"], 1, "Whose + noun."],
    ["The smartphone _______ yesterday is mine.", ["who you borrowed", "which you borrowed", "whose you borrowed", "where you borrowed"], 1, "Which làm tân ngữ."],
    ["We visited a village _______ after the storm.", ["rebuilding", "rebuilt", "which rebuild", "to rebuild"], 1, "Rút gọn bị động."],
    ["I know the student _______ that coding problem.", ["solves", "solving", "to solve", "who can solve"], 3, "Mệnh đề quan hệ đầy đủ."],
    ["This is the moment _______ we have all been waiting for.", ["that", "where", "when", "whose"], 2, "Moment when."],
    ["The volunteers _______ missed the briefing.", ["arriving late", "arrived late", "to arrive late", "were arriving late"], 0, "Phân từ hiện tại diễn tả nguyên nhân."],
    ["The books _______ are on the top shelf.", ["donating by alumni", "donated by alumni", "donate by alumni", "to donate by alumni"], 1, "Reduced passive clause."],
    ["The factory _______ employs local workers.", ["opening last year", "opened last year", "which opening last year", "to open last year"], 1, "Reduced passive clause."],
    ["The students _______ must attend orientation.", ["choosing for the programme", "chosen for the programme", "choose for the programme", "to choose for the programme"], 1, "Reduced passive clause."],
  ];
  return buildBank("relative-clauses", rows);
}

function buildPhrasalVerbsBank() {
  const rows = [
    ["We had to _______ the meeting because the internet system crashed.", ["carry on", "put off", "look after", "take after"], 1, "Put off = postpone."],
    ["She _______ her grandmother in the way she smiles.", ["takes after", "takes off", "turns down", "gets over"], 0, "Take after = resemble."],
    ["Please _______ your application form before Friday.", ["fill in", "break down", "go over", "look up"], 0, "Fill in a form."],
    ["It took him months to _______ the disappointment of failing the first round.", ["get over", "turn up", "put on", "bring about"], 0, "Get over = recover from."],
    ["Can you _______ this word in the dictionary for me?", ["look up", "look after", "give away", "find out with"], 0, "Look up = tra cứu."],
    ["The plane will _______ in ten minutes, so passengers should board now.", ["take after", "take off", "take in", "take over"], 1, "Take off = cất cánh."],
    ["He refused to _______ his dream even after several setbacks.", ["give up", "bring up", "make up", "show up"], 0, "Give up = từ bỏ."],
    ["The new policy was introduced to _______ a fairer learning environment.", ["bring about", "look for", "turn into", "carry out on"], 0, "Bring about = cause."],
    ["We need to _______ the final draft once more before submitting it.", ["go over", "go off", "go under", "go out"], 0, "Go over = review."],
    ["The charity event _______ far more money than expected.", ["brought in", "broke up", "gave off", "looked over"], 0, "Bring in = earn/collect."],
    ["The teacher told us not to _______ details when summarising the passage.", ["leave out", "put away", "take up", "break into"], 0, "Leave out = omit."],
    ["After months of practice, she finally _______ a solution to the problem.", ["came up with", "looked forward to", "ran out of", "put up with"], 0, "Come up with = think of."],
    ["The volunteers _______ food and blankets to flood victims.", ["gave out", "ran into", "turned over", "looked down on"], 0, "Give out = distribute."],
    ["I didn't expect to _______ my former teacher at the airport.", ["run into", "run out", "run over", "run down"], 0, "Run into = gặp tình cờ."],
    ["This printer keeps _______ whenever too many students use it at once.", ["breaking down", "taking off", "looking up", "showing off"], 0, "Break down = stop working."],
    ["The school has decided to _______ a coding club for Grade 12 students.", ["set up", "set off", "set aside", "set down"], 0, "Set up = establish."],
    ["They had to _______ the old gym to make room for the new library.", ["pull down", "bring up", "look over", "turn up"], 0, "Pull down = demolish."],
    ["Would you mind _______ the lights before leaving the room?", ["turning off", "turning up", "turning into", "turning over"], 0, "Turn off = switch off."],
    ["She always _______ her notes carefully the night before a test.", ["looks through", "looks down on", "looks after", "looks into"], 0, "Look through = read quickly."],
    ["The government plans to _______ stricter rules on online safety.", ["bring in", "bring round", "bring up", "bring back"], 0, "Bring in laws/rules."],
    ["\"Once in a blue moon\" is closest in meaning to _______.", ["very often", "very rarely", "at the same time", "without warning"], 1, "Idiom for rarity."],
    ["\"A piece of cake\" means something is _______.", ["expensive", "dangerous", "very easy", "unexpected"], 2, "Very easy."],
    ["If your teacher says \"Hit the books\", you should _______.", ["go to sleep", "study hard", "buy new books", "return the books"], 1, "Hit the books = study."],
    ["When someone is \"under the weather\", they are _______.", ["confused", "unwell", "busy", "late"], 1, "Under the weather = ill."],
    ["\"Break the ice\" means to _______.", ["end a friendship", "start a conversation comfortably", "cancel a plan", "hide your feelings"], 1, "Break the ice."],
    ["If a plan \"goes down the drain\", it _______.", ["becomes more expensive", "fails completely", "improves slowly", "needs more discussion"], 1, "Go down the drain = fail."],
    ["\"On the same wavelength\" means two people _______.", ["argue a lot", "think similarly", "live far apart", "work in silence"], 1, "Think in a similar way."],
    ["If a student \"keeps an eye on\" the time, the student _______.", ["ignores it", "monitors it carefully", "wastes it", "changes it"], 1, "Keep an eye on = watch carefully."],
    ["\"The ball is in your court\" means _______.", ["you are under pressure", "it is your turn to act", "the game is over", "you should stay calm"], 1, "Your responsibility now."],
    ["When someone \"calls it a day\", they _______.", ["continue until midnight", "stop working", "celebrate a success", "change the topic"], 1, "Call it a day = stop."],
    ["We are really _______ time, so let's move to the last question.", ["running into", "running out of", "running over", "running by"], 1, "Run out of time."],
    ["The principal will _______ the winners during the closing ceremony.", ["call for", "call on", "call out", "call off"], 2, "Call out names."],
    ["She can no longer _______ the constant noise from the construction site.", ["put up with", "take after", "look up to", "come down with"], 0, "Put up with = tolerate."],
    ["Many students _______ their teachers for career advice.", ["look up to", "look out for", "look down on", "look away from"], 0, "Look up to = admire."],
    ["The team managed to _______ the deadline despite the heavy workload.", ["fall behind", "keep up with", "catch up on", "come up against"], 1, "Keep up with a schedule/deadline."],
    ["Don't forget to _______ your files before reinstalling the software.", ["back up", "take off", "set out", "bring down"], 0, "Back up = save a copy."],
    ["His joke didn't really _______ with the audience.", ["go down", "go over", "go by", "go with"], 1, "Go over well/badly = be received."],
    ["The students were asked to _______ a short survey after the workshop.", ["carry out", "hand in", "bring out", "cut down"], 1, "Hand in = submit."],
    ["The company decided to _______ remote training after the pilot programme.", ["roll out", "make up", "drop by", "set in"], 0, "Roll out = launch widely."],
    ["If you don't understand the instructions, ask the tutor to _______ them again.", ["go over", "put away", "show off", "break off"], 0, "Go over = explain/review."],
  ];
  return buildBank("phrasal-verbs-idioms", rows);
}

function buildCollocationBank() {
  const rows = [
    ["Students should _______ notes while listening to the lecture.", ["do", "make", "take", "get"], 2, "Take notes."],
    ["We need to _______ a decision before the registration deadline.", ["make", "do", "take", "get"], 0, "Make a decision."],
    ["She always _______ progress when she studies with clear goals.", ["does", "makes", "takes", "gets"], 1, "Make progress."],
    ["Our team must _______ responsibility for the final presentation.", ["do", "make", "take", "get"], 2, "Take responsibility."],
    ["He managed to _______ good grades despite his part-time job.", ["do", "make", "get", "take"], 2, "Get good grades."],
    ["The students were asked to _______ research on local history.", ["do", "make", "get", "take"], 0, "Do research."],
    ["Lan hopes to _______ experience through volunteer work this summer.", ["make", "do", "gain", "take"], 2, "Gain experience."],
    ["The school will _______ a survey on students' reading habits.", ["make", "conduct", "take", "bring"], 1, "Conduct a survey."],
    ["Please _______ attention to the signal words in the passage.", ["do", "pay", "make", "take"], 1, "Pay attention."],
    ["The internship gave her a chance to _______ practical skills.", ["develop", "make", "take", "do"], 0, "Develop skills."],
    ["Many teenagers _______ social media to keep in touch with friends.", ["do", "use", "make", "get"], 1, "Use social media."],
    ["The government aims to _______ awareness of mental health in schools.", ["raise", "lift", "grow", "take"], 0, "Raise awareness."],
    ["She had to _______ an effort to stay calm during the interview.", ["make", "do", "take", "get"], 0, "Make an effort."],
    ["The club encourages members to _______ part in community service.", ["make", "take", "do", "get"], 1, "Take part in."],
    ["Students should _______ full use of the school library.", ["take", "make", "do", "get"], 1, "Make use of."],
    ["He finally _______ permission to access the lab after training.", ["made", "did", "got", "took"], 2, "Get permission."],
    ["The article _______ emphasis on the role of critical thinking.", ["has", "makes", "puts", "does"], 2, "Put emphasis on."],
    ["Our class plans to _______ a charity campaign next month.", ["launch", "do", "take", "gain"], 0, "Launch a campaign."],
    ["The mentor advised us to _______ realistic goals for the semester.", ["set", "do", "get", "bring"], 0, "Set goals."],
    ["Parents should _______ an example for their children.", ["do", "set", "make", "take"], 1, "Set an example."],
    ["The school wants to _______ stronger links with local businesses.", ["build", "take", "do", "have"], 0, "Build links."],
    ["Please _______ a seat while the technician checks the projector.", ["take", "make", "do", "get"], 0, "Take a seat."],
    ["The teacher asked us to _______ a short summary of the article.", ["take", "make", "do", "get"], 1, "Make a summary is acceptable here in EFL; better than others."],
    ["It is important to _______ a balance between study and rest.", ["have", "do", "take", "get"], 0, "Have a balance."],
    ["The company hopes to _______ a positive impact on the local community.", ["have", "do", "make", "take"], 2, "Make an impact."],
    ["They need to _______ further action to reduce plastic waste.", ["make", "take", "do", "get"], 1, "Take action."],
    ["Our class managed to _______ enough money for the field trip.", ["raise", "lift", "make up", "take"], 0, "Raise money."],
    ["You should _______ your homework before checking the answer key.", ["make", "do", "take", "get"], 1, "Do homework."],
    ["The principal promised to _______ support for student start-up ideas.", ["offer", "do", "take", "get"], 0, "Offer support."],
    ["We must _______ the problem from several different angles.", ["approach", "do", "make", "take"], 0, "Approach a problem."],
    ["The brochure helps tourists _______ informed choices about transport.", ["make", "do", "take", "get"], 0, "Make choices."],
    ["He was able to _______ a living by tutoring online in the evenings.", ["do", "make", "take", "get"], 1, "Make a living."],
    ["The workshop will _______ participants with useful networking tips.", ["provide", "make", "take", "do"], 0, "Provide somebody with something."],
    ["You can _______ advantage of the free mock tests on the website.", ["do", "make", "take", "get"], 2, "Take advantage of."],
    ["The researcher tried to _______ contact with several former volunteers.", ["make", "do", "have", "take"], 0, "Make contact."],
    ["She wants to _______ confidence before the final speaking test.", ["build", "do", "make", "take"], 0, "Build confidence."],
    ["The team will _______ a review of the current safety procedures.", ["carry out", "make up", "put off", "look after"], 0, "Carry out a review."],
    ["We should _______ every opportunity to practise in real contexts.", ["take", "do", "get", "make"], 0, "Take an opportunity."],
    ["The article tries to _______ light on the causes of school stress.", ["throw", "make", "take", "do"], 0, "Throw light on."],
    ["Good listeners usually _______ thoughtful questions at the end.", ["raise", "do", "take", "make"], 0, "Raise questions."],
  ];
  return buildBank("collocations-word-choice", rows);
}

function buildReadingEducationBank() {
  const passages = [
    {
      text: "Read the notice: 'Career Day starts at 8:00 a.m. in the main hall. Students should bring a notebook and arrive 15 minutes early for check-in.'",
      qs: [
        ["What should students bring to Career Day?", ["A school uniform", "A notebook", "A laptop charger", "A lunch box"], 1, "Thông tin nêu trực tiếp trong notice."],
        ["Where will Career Day take place?", ["In the computer room", "In the library", "In the main hall", "In the science lab"], 2, "Main hall."],
        ["What time should students ideally be there?", ["7:45 a.m.", "8:00 a.m.", "8:15 a.m.", "9:00 a.m."], 0, "Arrive 15 minutes early."],
        ["What is the purpose of the notice?", ["To cancel an event", "To announce a schedule", "To invite teachers to dinner", "To advertise a textbook"], 1, "Thông báo lịch và yêu cầu."],
      ],
    },
    {
      text: "Read the message: 'The internship workshop has moved online because of the weather. Registered students will receive a meeting link by email at noon.'",
      qs: [
        ["Why was the workshop moved online?", ["Because the speaker was absent", "Because of the weather", "Because the room was too small", "Because students requested it"], 1, "Nêu rõ trong tin nhắn."],
        ["How will students join the workshop?", ["By phone call", "By printed invitation", "By a meeting link", "By school bus"], 2, "Meeting link by email."],
        ["Who will receive the meeting link?", ["All teachers", "Only new students", "Registered students", "Parents"], 2, "Registered students."],
        ["What is the message mainly about?", ["A deadline extension", "A change in format", "A lost email", "A scholarship result"], 1, "Thông báo đổi từ trực tiếp sang online."],
      ],
    },
    {
      text: "Read the passage: 'Many schools now include career orientation lessons in Grade 12. These sessions help students identify strengths, explore majors, and prepare for interviews.'",
      qs: [
        ["What is the main purpose of career orientation lessons?", ["To replace academic subjects", "To help students plan their future", "To reduce homework", "To prepare students for sports events"], 1, "Main idea."],
        ["Which activity is mentioned in the passage?", ["Learning to repair devices", "Preparing for interviews", "Practising musical instruments", "Selling handmade products"], 1, "Chi tiết trực tiếp."],
        ["The word 'strengths' is closest in meaning to _______.", ["personal advantages", "financial problems", "school buildings", "class rules"], 0, "Strengths = điểm mạnh."],
        ["What can be inferred from the passage?", ["Schools see career planning as important", "All students already know their major", "Interviews are no longer required", "Grade 12 students dislike guidance lessons"], 0, "Suy luận hợp lý."],
      ],
    },
    {
      text: "Read the passage: 'Online mock interviews allow students to practise speaking in realistic situations. They can replay their answers, notice weaknesses, and improve with each attempt.'",
      qs: [
        ["What can students do after a mock interview?", ["Replay their answers", "Skip feedback forever", "Change the interviewer", "Avoid speaking"], 0, "Passage nêu rõ replay."],
        ["What is one benefit of replaying answers?", ["It saves electricity", "It helps students notice weaknesses", "It removes all anxiety instantly", "It changes exam questions"], 1, "Chi tiết trực tiếp."],
        ["The word 'attempt' is closest in meaning to _______.", ["device", "try", "reward", "schedule"], 1, "Attempt = try."],
        ["What is the passage mainly about?", ["The disadvantages of interviews", "A way to improve interview skills", "Why students dislike technology", "The cost of online learning"], 1, "Main idea."],
      ],
    },
    {
      text: "Read the announcement: 'Students interested in hospitality careers may join the hotel-shadowing programme this July. Places are limited, so applicants should submit a short motivation letter.'",
      qs: [
        ["Who may join the programme?", ["Students interested in hospitality careers", "All primary pupils", "Only teachers", "Parents working at hotels"], 0, "Thông tin trực tiếp."],
        ["When will the programme take place?", ["In May", "In July", "In September", "In December"], 1, "This July."],
        ["Why should applicants act early?", ["The fee will increase", "Places are limited", "Transport is unavailable", "Hotels close soon"], 1, "Nêu rõ."],
        ["What must applicants submit?", ["A CV only", "A passport photo", "A motivation letter", "A medical form"], 2, "Short motivation letter."],
      ],
    },
    {
      text: "Read the passage: 'Universities increasingly value problem-solving, teamwork, and adaptability. These skills help freshmen cope with academic pressure and changing learning environments.'",
      qs: [
        ["Which skill is NOT mentioned?", ["Problem-solving", "Teamwork", "Adaptability", "Typing speed"], 3, "Typing speed không xuất hiện."],
        ["Who can benefit from these skills according to the passage?", ["Freshmen", "Retired workers", "Primary teachers only", "Hotel managers"], 0, "Freshmen."],
        ["The word 'cope with' is closest in meaning to _______.", ["avoid", "deal with", "cancel", "measure"], 1, "Cope with = deal with."],
        ["What is the main point of the passage?", ["Universities only care about grades", "Soft skills support students at university", "Adaptability is impossible to learn", "Teamwork reduces tuition fees"], 1, "Main idea."],
      ],
    },
    {
      text: "Read the message: 'The scholarship interview panel will focus on leadership experience and community service. Candidates should support each answer with a clear example.'",
      qs: [
        ["What will the panel focus on?", ["Travel plans", "Leadership and community service", "Math formulas", "Fashion sense"], 1, "Direct detail."],
        ["How should candidates support their answers?", ["With jokes", "With a clear example", "With another question", "With a dictionary"], 1, "Clear example."],
        ["What is the message mainly for?", ["Candidates preparing for an interview", "Teachers marking essays", "Students joining sports day", "Parents paying fees"], 0, "Audience."],
        ["What can be inferred about the interview?", ["It values practical evidence", "It lasts all day", "It is only about grades", "It is open to everyone"], 0, "Inference."],
      ],
    },
    {
      text: "Read the passage: 'Part-time jobs can teach teenagers punctuality, customer service, and financial responsibility. However, students need to balance work hours with study time.'",
      qs: [
        ["Which benefit is mentioned?", ["Free international travel", "Financial responsibility", "Guaranteed scholarships", "Perfect health"], 1, "Direct detail."],
        ["What should students balance?", ["Friends and hobbies only", "Work hours and study time", "Lunch and breakfast", "Art and music"], 1, "Direct detail."],
        ["The word 'punctuality' refers to being _______.", ["creative", "on time", "silent", "wealthy"], 1, "Punctuality = đúng giờ."],
        ["Which statement best summarises the passage?", ["Part-time jobs are always harmful", "Part-time work can be useful if managed well", "Teenagers should work full time", "Study is less important than income"], 1, "Main idea."],
      ],
    },
    {
      text: "Read the passage: 'Some schools invite alumni to share career journeys. Hearing real stories helps students understand how interests, effort, and unexpected choices shape a profession.'",
      qs: [
        ["Why do schools invite alumni?", ["To teach PE lessons", "To share career journeys", "To repair classrooms", "To sell uniforms"], 1, "Detail."],
        ["What do students gain from real stories?", ["A free certificate", "A better understanding of career development", "Higher exam scores immediately", "Shorter school days"], 1, "Main idea."],
        ["The word 'shape' is closest in meaning to _______.", ["influence", "erase", "measure", "hide"], 0, "Shape = influence/form."],
        ["What can be inferred from the passage?", ["Career paths are not always straight", "Alumni dislike speaking to students", "Only talent matters in careers", "Unexpected choices always fail"], 0, "Inference."],
      ],
    },
    {
      text: "Read the notice: 'The CV clinic on Friday offers quick feedback on layout, word choice, and grammar. Students should upload a draft at least one day in advance.'",
      qs: [
        ["What does the clinic offer?", ["Exam answers", "Quick feedback on CVs", "Laptop repairs", "Interview clothes"], 1, "Direct detail."],
        ["What should students upload?", ["A draft CV", "A passport", "A video interview", "A school timetable"], 0, "Direct detail."],
        ["When should the draft be uploaded?", ["On Friday evening", "At least one day in advance", "After the clinic ends", "Exactly at midnight"], 1, "Time requirement."],
        ["What is the purpose of the notice?", ["To provide application guidance", "To cancel a workshop", "To sell a writing course", "To report exam results"], 0, "Main purpose."],
      ],
    },
  ];
  const rows = [];
  passages.forEach((item, passageIndex) => {
    item.qs.forEach((q, qIndex) => {
      rows.push([`${item.text} ${q[0]}`, q[1], q[2], q[3]]);
    });
  });
  return buildBank("reading-education-career", rows);
}

function buildReadingEnvironmentBank() {
  const passages = [
    {
      text: "Read the passage: 'Many schools now encourage students to bring refillable bottles. This simple habit reduces plastic waste and saves money over time.'",
      qs: [
        ["What habit is encouraged?", ["Using plastic straws", "Bringing refillable bottles", "Buying bottled water daily", "Throwing bottles away"], 1, "Direct detail."],
        ["What is one result of this habit?", ["More traffic", "Less plastic waste", "Longer classes", "Higher tuition"], 1, "Direct detail."],
        ["The word 'reduces' is closest in meaning to _______.", ["increases", "cuts", "stores", "measures"], 1, "Reduce = cut."],
        ["What is the passage mainly about?", ["A small action with environmental benefits", "A new school uniform rule", "The dangers of drinking water", "A plan to close canteens"], 0, "Main idea."],
      ],
    },
    {
      text: "Read the notice: 'Saturday's clean-up starts at the riverside park. Volunteers should wear hats, bring gloves, and sort litter into paper, plastic, and general waste.'",
      qs: [
        ["Where does the clean-up start?", ["At the school gate", "At the riverside park", "At the museum", "At the bus station"], 1, "Direct detail."],
        ["What should volunteers bring?", ["An umbrella and ladder", "Gloves", "A lunch ticket", "Paint brushes"], 1, "Direct detail."],
        ["How should litter be handled?", ["Burned immediately", "Sorted into categories", "Left near the river", "Taken home"], 1, "Direct detail."],
        ["What is the notice mainly about?", ["A volunteer activity", "A sports tournament", "A library event", "A parking change"], 0, "Main purpose."],
      ],
    },
    {
      text: "Read the passage: 'Planting native trees helps local birds and insects because these species have evolved together. Native plants also require less water than many imported ones.'",
      qs: [
        ["Why do native trees help wildlife?", ["They are taller", "Species have evolved together", "They grow indoors", "They have no leaves"], 1, "Direct detail."],
        ["What is another advantage of native plants?", ["They require less water", "They never lose leaves", "They grow overnight", "They cost nothing"], 0, "Direct detail."],
        ["The word 'imported' is closest in meaning to _______.", ["locally grown", "brought from abroad", "very old", "poorly watered"], 1, "Imported = from elsewhere."],
        ["Which statement best summarises the passage?", ["Native plants support ecosystems efficiently", "All imported plants are harmful", "Birds only live in forests", "Trees should be planted in pots"], 0, "Main idea."],
      ],
    },
    {
      text: "Read the message: 'Because the air quality index is high this afternoon, outdoor PE classes will be replaced with indoor stretching and health education.'",
      qs: [
        ["Why are outdoor classes replaced?", ["It is too cold", "The air quality index is high", "The field is crowded", "Teachers are absent"], 1, "Direct detail."],
        ["What will students do instead?", ["Play football", "Indoor stretching and health education", "Go home early", "Take a math test"], 1, "Direct detail."],
        ["The phrase 'air quality index' refers to _______.", ["a sports score", "a measure of air conditions", "a train schedule", "a type of plant"], 1, "Context meaning."],
        ["What is the purpose of the message?", ["To promote outdoor exercise", "To announce a schedule change for safety", "To invite students to a race", "To sell masks"], 1, "Purpose."],
      ],
    },
    {
      text: "Read the passage: 'Solar panels can lower electricity bills, but their long-term value depends on sunlight, installation quality, and maintenance.'",
      qs: [
        ["What can solar panels help reduce?", ["School uniforms", "Electricity bills", "Class size", "Travel time"], 1, "Direct detail."],
        ["What does their long-term value depend on?", ["Sunlight and maintenance", "Only colour", "Only government ads", "Students' grades"], 0, "Direct detail."],
        ["The word 'depends on' is closest in meaning to _______.", ["results in", "relies on", "compares with", "hides from"], 1, "Depends on = relies on."],
        ["What is the passage mainly about?", ["A balanced view of solar panels", "Why bills always rise", "How to paint rooftops", "The history of batteries"], 0, "Main idea."],
      ],
    },
    {
      text: "Read the notice: 'Please switch off fans and projectors before leaving the classroom. This simple step helps the school reduce energy waste every day.'",
      qs: [
        ["What should be switched off?", ["Fans and projectors", "Windows and doors", "Books and pens", "Tables and chairs"], 0, "Direct detail."],
        ["What does this step help reduce?", ["Travel costs", "Energy waste", "Homework", "Library noise"], 1, "Direct detail."],
        ["The word 'waste' is closest in meaning to _______.", ["loss through unnecessary use", "a useful habit", "fresh air", "extra storage"], 0, "Context meaning."],
        ["What is the notice mainly encouraging?", ["Careless behaviour", "Energy-saving action", "Buying new equipment", "Leaving earlier"], 1, "Main purpose."],
      ],
    },
    {
      text: "Read the passage: 'Fast fashion offers cheap clothes, yet it often leads to overconsumption and textile waste. Buying fewer durable items may be a more sustainable choice.'",
      qs: [
        ["What problem is linked to fast fashion?", ["Too much textile waste", "Lack of colours", "Poor internet access", "Longer school hours"], 0, "Direct detail."],
        ["What is suggested as a better choice?", ["Buying more items weekly", "Buying fewer durable items", "Avoiding all clothes", "Changing uniforms daily"], 1, "Direct detail."],
        ["The word 'durable' is closest in meaning to _______.", ["long-lasting", "cheap", "bright", "fashionable"], 0, "Durable = long-lasting."],
        ["What is the main idea of the passage?", ["Cheap clothes are always best", "Shopping habits can affect sustainability", "Fashion has no environmental cost", "Students dislike recycling"], 1, "Main idea."],
      ],
    },
    {
      text: "Read the passage: 'Wetlands act like natural sponges during storms. They absorb excess water, reduce flooding, and provide habitats for many species.'",
      qs: [
        ["How do wetlands help during storms?", ["They create stronger winds", "They absorb excess water", "They stop all rain", "They raise sea levels"], 1, "Direct detail."],
        ["What else do wetlands provide?", ["New roads", "Habitats for species", "Factory jobs", "Exam venues"], 1, "Direct detail."],
        ["The word 'act like' is closest in meaning to _______.", ["look after", "function as", "disagree with", "travel to"], 1, "Act like = function as."],
        ["What is the passage mainly about?", ["The importance of wetlands", "A storm warning system", "How to build a sponge", "Why cities need more factories"], 0, "Main idea."],
      ],
    },
    {
      text: "Read the announcement: 'The eco-club is collecting old batteries this week. Students should place them in the marked box because batteries require special disposal.'",
      qs: [
        ["What is the eco-club collecting?", ["Old notebooks", "Old batteries", "Glass bottles", "Sports shoes"], 1, "Direct detail."],
        ["Where should students put them?", ["In any bin", "In the marked box", "At the school gate", "In the library"], 1, "Direct detail."],
        ["Why is special disposal needed?", ["Batteries require careful handling", "Batteries are cheap", "The box is full", "Students requested it"], 0, "Inference from statement."],
        ["What is the purpose of the announcement?", ["To guide a battery collection drive", "To cancel club activities", "To sell electronics", "To invite parents to a meeting"], 0, "Purpose."],
      ],
    },
    {
      text: "Read the passage: 'Some cities are creating more bike lanes to reduce traffic and pollution. When cycling feels safer, more residents are willing to leave motorbikes at home.'",
      qs: [
        ["Why are more bike lanes being created?", ["To increase pollution", "To reduce traffic and pollution", "To close public parks", "To attract tourists only"], 1, "Direct detail."],
        ["What happens when cycling feels safer?", ["Residents avoid roads", "More people choose bicycles", "Traffic lights stop working", "Fuel prices fall"], 1, "Direct detail."],
        ["The word 'residents' refers to _______.", ["city visitors", "people living in the city", "school principals", "bike sellers"], 1, "Context meaning."],
        ["What is the best summary of the passage?", ["Safer cycling can support greener transport", "Cities should ban walking", "Pollution comes only from factories", "Bike lanes slow all transport"], 0, "Main idea."],
      ],
    },
  ];
  const rows = [];
  passages.forEach((item) => {
    item.qs.forEach((q) => {
      rows.push([`${item.text} ${q[0]}`, q[1], q[2], q[3]]);
    });
  });
  return buildBank("reading-environment", rows);
}

function buildPhoneticsBank() {
  const pronunciation = [
    ["Choose the word whose underlined part differs: ch**ea**p, m**ea**t, br**ea**d, r**ea**ch", ["cheap", "meat", "bread", "reach"], 2, "\"bread\" có /e/."],
    ["Choose the word whose underlined part differs: h**o**pe, n**o**te, cl**o**se, d**o**ne", ["hope", "note", "close", "done"], 3, "\"done\" có /ʌ/."],
    ["Choose the word whose underlined part differs: d**ea**l, p**ea**ce, h**ea**d, l**ea**f", ["deal", "peace", "head", "leaf"], 2, "\"head\" có /e/."],
    ["Choose the word whose underlined part differs: watch**ed**, play**ed**, clean**ed**, enjoy**ed**", ["watched", "played", "cleaned", "enjoyed"], 0, "-ed đọc /t/."],
    ["Choose the word whose underlined part differs: book**s**, pen**s**, ruler**s**, key**s**", ["books", "pens", "rulers", "keys"], 0, "-s đọc /s/."],
    ["Choose the word whose underlined part differs: m**a**chine, p**a**ge, ch**a**nge, l**a**te", ["machine", "page", "change", "late"], 0, "\"machine\" có /ə/."],
    ["Choose the word whose underlined part differs: c**ou**nt, h**ou**se, y**ou**ng, s**ou**nd", ["count", "house", "young", "sound"], 2, "\"young\" có /ʌ/."],
    ["Choose the word whose underlined part differs: r**i**ce, t**i**me, f**i**lm, l**i**ke", ["rice", "time", "film", "like"], 2, "\"film\" có /ɪ/."],
    ["Choose the word whose underlined part differs: stopp**ed**, wanted, wash**ed**, laugh**ed**", ["stopped", "wanted", "washed", "laughed"], 1, "\"wanted\" có /ɪd/."],
    ["Choose the word whose underlined part differs: m**oo**n, sch**oo**l, bl**oo**d, f**oo**d", ["moon", "school", "blood", "food"], 2, "\"blood\" có /ʌ/."],
    ["Choose the word whose underlined part differs: achiev**es**, rais**es**, clos**es**, watch**es**", ["achieves", "raises", "closes", "watches"], 3, "-es đọc /ɪz/."],
    ["Choose the word whose underlined part differs: s**u**gar, st**u**dent, d**u**ty, c**u**t", ["sugar", "student", "duty", "cut"], 3, "\"cut\" có /ʌ/."],
    ["Choose the word whose underlined part differs: h**ea**rt, p**ar**k, c**ar**d, st**ar**", ["heart", "park", "card", "star"], 0, "Tổ hợp gạch chân khác về mặt chính tả-âm vị so với nhóm còn lại."],
    ["Choose the word whose underlined part differs: b**a**by, m**a**ny, p**a**per, l**a**dy", ["baby", "many", "paper", "lady"], 1, "\"many\" có âm /e/."],
    ["Choose the word whose underlined part differs: c**h**emistry, s**h**are, was**h**, pu**sh**", ["chemistry", "share", "wash", "push"], 0, "\"chemistry\" có /k/."],
    ["Choose the word whose underlined part differs: m**o**ve, pr**o**ve, l**o**ve, st**o**ne", ["move", "prove", "love", "stone"], 2, "\"love\" có /ʌ/."],
    ["Choose the word whose underlined part differs: th**i**nk, th**i**s, wr**i**st, s**i**nce", ["think", "this", "wrist", "since"], 1, "\"this\" có /ɪ/ nhưng phụ âm đầu /ð/ khác nhóm /θ/ nếu xét phần gạch chân 'th'."],
    ["Choose the word whose underlined part differs: call**ed**, need**ed**, visit**ed**, start**ed**", ["called", "needed", "visited", "started"], 0, "\"called\" có /d/, hai từ cần /ɪd/ và một từ /ɪd/."],
    ["Choose the word whose underlined part differs: m**i**nute, p**i**lot, pol**i**ce, v**i**llage", ["minute", "pilot", "police", "village"], 2, "\"police\" nhấn âm và nguyên âm khác /ə/."],
    ["Choose the word whose underlined part differs: w**or**d, b**ir**d, f**ir**st, c**ir**cle", ["word", "bird", "first", "circle"], 3, "\"circle\" có /ə/ ở âm tiết không nhấn."],
  ];
  const safeStress = [
    ["Choose the word with a different stress pattern: attract, decide, open, enjoy", ["attract", "decide", "open", "enjoy"], 2, "\"open\" nhấn âm đầu."],
    ["Choose the word with a different stress pattern: biology, geography, technology, customer", ["biology", "geography", "technology", "customer"], 3, "\"customer\" nhấn âm đầu."],
    ["Choose the word with a different stress pattern: polite, complete, famous, deny", ["polite", "complete", "famous", "deny"], 2, "\"famous\" nhấn âm đầu."],
    ["Choose the word with a different stress pattern: success, event, answer, respect", ["success", "event", "answer", "respect"], 2, "\"answer\" nhấn âm đầu."],
    ["Choose the word with a different stress pattern: economic, scientific, athletic, yesterday", ["economic", "scientific", "athletic", "yesterday"], 3, "\"yesterday\" nhấn âm đầu."],
    ["Choose the word with a different stress pattern: employee, engineer, family, agree", ["employee", "engineer", "family", "agree"], 2, "\"family\" nhấn âm đầu."],
    ["Choose the word with a different stress pattern: volunteer, referee, entertain, festival", ["volunteer", "referee", "entertain", "festival"], 3, "\"festival\" nhấn âm đầu."],
    ["Choose the word with a different stress pattern: pollution, solution, capable, collection", ["pollution", "solution", "capable", "collection"], 2, "\"capable\" nhấn âm đầu."],
    ["Choose the word with a different stress pattern: Japanese, examinee, refugee, confident", ["Japanese", "examinee", "refugee", "confident"], 3, "\"confident\" nhấn âm đầu."],
    ["Choose the word with a different stress pattern: committee, photography, biology, holiday", ["committee", "photography", "biology", "holiday"], 3, "\"holiday\" nhấn âm đầu."],
    ["Choose the word with a different stress pattern: maintain, achieve, danger, relate", ["maintain", "achieve", "danger", "relate"], 2, "\"danger\" nhấn âm đầu."],
    ["Choose the word with a different stress pattern: internet, television, recycle, engineer", ["internet", "television", "recycle", "engineer"], 0, "\"internet\" nhấn âm đầu."],
    ["Choose the word with a different stress pattern: personal, consider, encourage, interview", ["personal", "consider", "encourage", "interview"], 0, "\"personal\" nhấn âm đầu."],
    ["Choose the word with a different stress pattern: ability, originality, practical, equality", ["ability", "originality", "practical", "equality"], 2, "\"practical\" nhấn âm đầu."],
    ["Choose the word with a different stress pattern: support, involve, student, predict", ["support", "involve", "student", "predict"], 2, "\"student\" nhấn âm đầu."],
    ["Choose the word with a different stress pattern: expensive, important, remember, effective", ["expensive", "important", "remember", "effective"], 2, "\"remember\" có mẫu trọng âm khác nhóm còn lại."],
    ["Choose the word with a different stress pattern: company, success, machine, correct", ["company", "success", "machine", "correct"], 0, "\"company\" nhấn âm đầu."],
    ["Choose the word with a different stress pattern: organize, decorate, volunteer, introduce", ["organize", "decorate", "volunteer", "introduce"], 2, "\"volunteer\" nhấn âm 3."],
    ["Choose the word with a different stress pattern: literature, agriculture, entertain, temperature", ["literature", "agriculture", "entertain", "temperature"], 2, "\"entertain\" nhấn âm cuối."],
    ["Choose the word with a different stress pattern: applicant, relation, assistant, musician", ["applicant", "relation", "assistant", "musician"], 0, "\"applicant\" nhấn âm đầu."],
  ];
  return buildBank("phonetics-stress", [...pronunciation, ...safeStress]);
}

function buildPrepositionsBank() {
  const rows = [
    ["She is interested _______ environmental science.", ["in", "on", "at", "for"], 0, "Interested in."],
    ["The teacher was pleased _______ our final project.", ["with", "about", "to", "for"], 0, "Pleased with."],
    ["Please divide the class _______ four discussion groups.", ["to", "into", "for", "by"], 1, "Divide into."],
    ["He apologized _______ arriving late to the meeting.", ["about", "for", "at", "with"], 1, "Apologize for."],
    ["The essay focuses _______ the impact of AI on education.", ["in", "with", "on", "from"], 2, "Focus on."],
    ["Parents should encourage children to be responsible _______ their actions.", ["for", "with", "to", "on"], 0, "Responsible for."],
    ["The school is equipped _______ a modern language lab.", ["with", "for", "to", "in"], 0, "Equipped with."],
    ["Our success depends largely _______ how well we prepare.", ["at", "in", "on", "for"], 2, "Depend on."],
    ["She has a talent _______ explaining complex ideas clearly.", ["to", "for", "with", "on"], 1, "Talent for."],
    ["The volunteers provided local families _______ food and medicine.", ["of", "with", "to", "for"], 1, "Provide somebody with something."],
    ["I am not very good _______ remembering names.", ["at", "in", "for", "with"], 0, "Good at."],
    ["The guide warned us _______ touching the coral reef.", ["not", "for", "against", "from"], 2, "Warn somebody against V-ing."],
    ["Many students struggle _______ time management in Grade 12.", ["for", "with", "at", "to"], 1, "Struggle with."],
    ["She succeeded _______ convincing the board to fund the project.", ["at", "in", "on", "for"], 1, "Succeed in."],
    ["The new policy aims _______ reducing single-use plastics on campus.", ["at", "for", "to", "with"], 0, "Aim at V-ing."],
    ["The article is based _______ data collected from 500 students.", ["at", "on", "to", "for"], 1, "Based on."],
    ["My brother is keen _______ joining the robotics competition.", ["in", "on", "for", "about"], 1, "Keen on."],
    ["The museum is famous _______ its interactive science exhibits.", ["with", "about", "for", "at"], 2, "Famous for."],
    ["We were surprised _______ the speed of the rescue operation.", ["by", "at", "with", "for"], 1, "Surprised at."],
    ["She takes pride _______ helping younger students improve.", ["in", "at", "on", "to"], 0, "Take pride in."],
    ["The company is looking _______ applicants with strong digital skills.", ["at", "for", "after", "into"], 1, "Look for."],
    ["Please hand _______ your phones before the lab session begins.", ["in", "on", "over", "up"], 0, "Hand in."],
    ["The speaker pointed _______ that many jobs now require adaptability.", ["out", "up", "away", "off"], 0, "Point out."],
    ["Students can benefit _______ regular self-assessment after each unit.", ["from", "of", "to", "with"], 0, "Benefit from."],
    ["The principal agreed _______ extend the deadline by two days.", ["with", "for", "to", "on"], 2, "Agree to do something."],
    ["The documentary deals _______ plastic pollution in coastal cities.", ["with", "to", "for", "at"], 0, "Deal with."],
    ["Our teacher reminded us to concentrate _______ the key words.", ["at", "for", "on", "to"], 2, "Concentrate on."],
    ["She is capable _______ leading a team under pressure.", ["to", "of", "for", "with"], 1, "Capable of."],
    ["The students complained _______ the lack of practice tests.", ["for", "about", "with", "to"], 1, "Complain about."],
    ["The charity works _______ communities affected by drought.", ["for", "with", "at", "to"], 1, "Work with communities."],
    ["Many parents objected _______ the sudden increase in school fees.", ["against", "on", "to", "for"], 2, "Object to."],
    ["He insisted _______ paying for the team's travel expenses.", ["to", "in", "on", "for"], 2, "Insist on."],
    ["The report drew attention _______ the shortage of green spaces.", ["for", "to", "with", "at"], 1, "Attention to."],
    ["The coach congratulated the players _______ their discipline.", ["on", "for", "at", "with"], 0, "Congratulate somebody on something."],
    ["The course is suitable _______ students who want a quick review.", ["to", "for", "with", "at"], 1, "Suitable for."],
    ["The app allows learners to connect _______ tutors worldwide.", ["for", "with", "at", "to"], 1, "Connect with."],
    ["She was absent _______ class because she had a fever.", ["from", "to", "with", "of"], 0, "Absent from."],
    ["We should invest more _______ public transport to cut emissions.", ["on", "in", "for", "to"], 1, "Invest in."],
    ["The club consists _______ students from different schools.", ["in", "of", "for", "with"], 1, "Consist of."],
    ["He is familiar _______ most of the reading strategies in this book.", ["to", "for", "with", "about"], 2, "Familiar with."],
  ];
  return buildBank("prepositions-fixed-expressions", rows);
}

export const DIRECT_QUIZ_PRESETS = [
  {
    id: "quiz-sentence-transformation",
    source: "Câu đồng nghĩa (Sentence Transformation)",
    kind: "Grammar",
    count: "15",
    difficulty: "Nâng cao",
    notes: "Viết lại câu với so sánh, câu bị động, tường thuật và điều kiện.",
    questions: buildSentenceTransformationBank(),
    get defaultQuestions() {
      return pickQuestionSet(this.questions, [1, 2, 4, 5, 6, 7, 8, 11, 14, 15, 19, 20, 28, 29, 35]);
    },
  },
  {
    id: "quiz-error-identification",
    source: "Tìm lỗi sai (Error Identification)",
    kind: "Grammar",
    count: "20",
    difficulty: "Khá",
    notes: "Lỗi hòa hợp chủ vị, thì, từ loại và cấu trúc song song.",
    questions: buildErrorIdentificationBank(),
    get defaultQuestions() {
      return pickQuestionSet(this.questions, [1, 2, 3, 5, 6, 8, 9, 11, 12, 14, 15, 17, 20, 21, 22, 24, 27, 31, 32, 39]);
    },
  },
  {
    id: "quiz-tenses-verb-forms",
    source: "Thì động từ và dạng của động từ",
    kind: "Grammar",
    count: "25",
    difficulty: "Khá",
    notes: "Tập trung vào các thì, câu điều kiện, wish và sự phối hợp thì.",
    questions: buildTensesBank(),
    get defaultQuestions() {
      return pickQuestionSet(this.questions, [3, 4, 5, 6, 8, 9, 10, 13, 15, 17, 18, 19, 21, 22, 23, 24, 25, 26, 29, 30, 31, 34, 35, 38, 39]);
    },
  },
  {
    id: "quiz-relative-clauses",
    source: "Mệnh đề quan hệ và rút gọn mệnh đề",
    kind: "Grammar",
    count: "20",
    difficulty: "Khá",
    notes: "Bao gồm who, whom, whose, which, where, when và reduced clauses.",
    questions: buildRelativeClausesBank(),
    get defaultQuestions() {
      return pickQuestionSet(this.questions, [2, 3, 5, 6, 8, 9, 12, 14, 15, 17, 19, 20, 21, 22, 24, 26, 31, 32, 35, 36]);
    },
  },
  {
    id: "quiz-phrasal-verbs",
    source: "Phrasal Verbs và Idioms thường gặp",
    kind: "Vocabulary",
    count: "20",
    difficulty: "Nâng cao",
    notes: "Cụm động từ và thành ngữ xuất hiện nhiều trong đề THPTQG.",
    questions: buildPhrasalVerbsBank(),
    get defaultQuestions() {
      return pickQuestionSet(this.questions, [1, 4, 7, 8, 10, 11, 12, 14, 15, 16, 19, 20, 25, 26, 27, 28, 29, 33, 35, 39]);
    },
  },
  {
    id: "quiz-collocations",
    source: "Collocations và Word Choice",
    kind: "Vocabulary",
    count: "20",
    difficulty: "Khá",
    notes: "Cụm từ đi với make, do, take, get, raise, conduct và các lựa chọn từ tự nhiên.",
    questions: buildCollocationBank(),
    get defaultQuestions() {
      return pickQuestionSet(this.questions, [1, 2, 3, 4, 6, 8, 9, 12, 13, 14, 15, 18, 19, 21, 25, 26, 28, 31, 34, 40]);
    },
  },
  {
    id: "quiz-reading-education",
    source: "Reading: Education and Career Orientation",
    kind: "Reading",
    count: "10",
    difficulty: "Khá",
    notes: "Đọc hiểu ngắn về định hướng nghề nghiệp, CV, phỏng vấn và kỹ năng học tập.",
    questions: buildReadingEducationBank(),
    get defaultQuestions() {
      return pickQuestionSet(this.questions, [9, 10, 11, 12, 13, 14, 17, 18, 25, 26]);
    },
  },
  {
    id: "quiz-reading-environment",
    source: "Reading: Environment and Sustainable Living",
    kind: "Reading",
    count: "10",
    difficulty: "Nâng cao",
    notes: "Đọc hiểu ngắn về môi trường, tái chế, năng lượng và lối sống bền vững.",
    questions: buildReadingEnvironmentBank(),
    get defaultQuestions() {
      return pickQuestionSet(this.questions, [9, 10, 11, 12, 21, 22, 23, 24, 37, 38]);
    },
  },
  {
    id: "quiz-phonetics-stress",
    source: "Phát âm và Trọng âm",
    kind: "Phonetics",
    count: "30",
    difficulty: "Khá",
    notes: "Phân biệt nguyên âm, đuôi -ed/-s và quy tắc trọng âm 2-4 âm tiết.",
    questions: buildPhoneticsBank(),
    get defaultQuestions() {
      return pickQuestionSet(this.questions, [1, 2, 3, 4, 5, 7, 8, 10, 11, 15, 16, 17, 21, 22, 23, 24, 26, 27, 28, 29, 30, 31, 33, 34, 35, 36, 37, 38, 39, 40]);
    },
  },
  {
    id: "quiz-prepositions",
    source: "Giới từ và Fixed Expressions",
    kind: "Grammar",
    count: "20",
    difficulty: "Cơ bản",
    notes: "Giới từ đi với tính từ, động từ, danh từ và các cụm cố định lớp 12.",
    questions: buildPrepositionsBank(),
    get defaultQuestions() {
      return pickQuestionSet(this.questions, [1, 2, 3, 4, 5, 6, 8, 10, 11, 13, 14, 16, 18, 19, 21, 23, 24, 27, 35, 40]);
    },
  },
];

export const DIRECT_QUIZ_AUTOFILL_SAMPLES = DIRECT_QUIZ_PRESETS.map((preset) => ({
  id: preset.id,
  s: preset.source,
  k: preset.kind,
  q: preset.count,
  d: preset.difficulty,
  n: preset.notes,
}));

export function findDirectQuizPreset(meta) {
  const presetId = normalizeText(meta?.presetId);
  const source = normalizeText(meta?.source || meta?.topic);
  const kind = normalizeText(meta?.kind);
  const difficulty = normalizeText(meta?.difficulty);

  return (
    DIRECT_QUIZ_PRESETS.find((preset) => normalizeText(preset.id) === presetId)
    || DIRECT_QUIZ_PRESETS.find((preset) => (
      normalizeText(preset.source) === source
      && normalizeText(preset.kind) === kind
      && (!difficulty || normalizeText(preset.difficulty) === difficulty)
    ))
    || null
  );
}
