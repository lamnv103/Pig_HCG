% ===================================================================
% PIG-DIAGNOSTIC EXPERT SYSTEM - KNOWLEDGE BASE & INFERENCE ENGINE
% Version: 7.0_Final_Boss (Ultimate AI Reasoning)
% Features: Full MYCIN CF Combine, Priority Boost, Noise Filter, Explainability
% ===================================================================

:- encoding(utf8).

% Khai báo fact động (Working Memory + Knowledge Admin runtime)
% known(SymptomId, UserCF). % UserCF có thể âm (từ -1.0 đến 1.0)
:- dynamic known/2, symptom/2, disease/9, rule/5.

% Priority weighting (configurable per priority level)
priority_weight(1, 0.8).
priority_weight(2, 1.0).
priority_weight(3, 1.3).

% ===================================================================
% 1. METADATA
% ===================================================================
metadata(system_name, 'Pig-Diagnostic Expert System').
metadata(version, '7.0_Final_Boss').
metadata(last_updated, '2026-04-11').

% ===================================================================
% 2. SYMPTOMS & DISEASES (Synced from expanded JSON)
% ===================================================================
% Source: data/pig_diagnostic_expert_system_v4_expanded.json
symptom(sym_tieu_chay_trang_vang_song, 'Lợn (sơ sinh - sau cai sữa) có tiêu chảy phân lỏng trắng, vàng hoặc phân sống không?').
symptom(sym_tieu_chay_mau, 'Lợn con có tiêu chảy ra máu tươi hoặc màu nâu, chết nhanh sau 2-3 ngày không?').
symptom(sym_tieu_chay_vang_set_tanh, 'Lợn con (7-36 ngày) có tiêu chảy phân vàng, sệt, mùi rất tanh, xù lông nhưng không sốt không?').
symptom(sym_tieu_chay_nuoc_oi, 'Lợn có tiêu chảy phân vàng nhiều nước, kèm theo ói mửa, lây lan nhanh trong bầy không?').
symptom(sym_phu_mi_mat_co_giat, 'Lợn (giai đoạn cai sữa) có bị phù mí mắt, mất thăng bằng, lảo đảo, khản giọng hoặc co giật không?').
symptom(sym_sot_vua_den_cao, 'Lợn có bị sốt vừa đến cao (40 - 41.5°C) không?').
symptom(sym_sot_rat_cao, 'Lợn có bị sốt rất cao (41.5 - 42.5°C) không?').
symptom(sym_tai_bung_tim_xanh, 'Vùng da ở tai, bụng, mặt trong đùi có tụ máu, chuyển sang màu sậm, tím xanh không?').
symptom(sym_xuat_huyet_da, 'Da có những điểm hoặc mảng xuất huyết đỏ không?').
symptom(sym_ban_hinh_vuong_thoi, 'Trên da (hông, bụng, lưng) có các đốm đỏ/tím hình vuông, hình thoi, cộm lên như mề đay không?').
symptom(sym_khit_mui_chay_nuoc_mat, 'Lợn có khịt mũi, hắt hơi liên tục, khóe mắt có chất tiết màu nâu không?').
symptom(sym_ho_keo_dai, 'Lợn có ho khan, ho kéo dài không?').
symptom(sym_kho_tho_the_bung, 'Lợn có khó thở, thở hóp bụng, ngồi thở tư thế chó ngồi không?').
symptom(sym_sui_bot_mau_mui, 'Lợn có sùi bọt máu ở mũi và miệng, tím tái cơ thể và chết đột ngột không?').
symptom(sym_da_do_tiet_dich_nhot, 'Da lợn con có sậm màu, tiết nhiều dịch nhớt bám thân, tạo vảy đen nhưng không ngứa không?').
symptom(sym_viem_vu_viem_tu_cung, 'Heo nái (sau sinh 12-72 giờ) có bị sưng bầu vú, đỏ tím, chảy dịch nhầy âm đạo có máu và mất sữa không?').
symptom(sym_sung_khop, 'Lợn có bị sưng các khớp (khuỷu, gối), đi lại khó khăn, thọt không?').
symptom(sym_mun_nuoc_mong_mieng, 'Lợn có mụn nước, vết loét vỡ ra ở vành móng, kẽ móng, mõm, sùi bọt mép không?').
symptom(sym_trieu_chung_than_kinh, 'Lợn có triệu chứng thần kinh như đi vòng tròn, ngã lăn, bơi chèo, mắt trợn ngược, co giật không?').
symptom(sym_sot_dot_ngot, 'Lợn có sốt đột ngột, bỏ ăn nhanh trong 1-2 ngày không?').
symptom(sym_ho_cap_tinh, 'Lợn có ho dữ dội, phát bệnh cấp tính cả đàn trong thời gian ngắn không?').
symptom(sym_chay_nuoc_mui, 'Lợn có chảy nước mũi, thở khò khè hoặc viêm mũi rõ không?').
symptom(sym_giam_tang_truong, 'Lợn có chậm lớn, gầy sút, giảm tăng trọng kéo dài không?').
symptom(sym_snout_deform, 'Lợn có biến dạng mõm, ngắn mõm, lệch vách ngăn mũi hoặc đầu mũi cong vẹo không?').
symptom(sym_nose_bleed, 'Lợn có chảy máu mũi hoặc máu khô ở hốc mũi không?').
symptom(sym_phan_nhot_mau, 'Lợn có phân nhầy, hôi khắm, lẫn máu hoặc màu đỏ nâu không?').
symptom(sym_sut_can, 'Lợn có sụt cân hoặc gầy mòn nhanh không?').
symptom(sym_abortions, 'Heo nái có sảy thai, đẻ non hoặc chết thai hàng loạt không?').
symptom(sym_mum_con_stillborn, 'Ổ đẻ có nhiều thai chết lưu, thai khô xác hoặc heo con chết sơ sinh không?').
symptom(sym_weak_piglets, 'Heo con sinh ra yếu, run, khó bú hoặc chết sớm không?').
symptom(sym_ngua_du_doi, 'Lợn có ngứa dữ dội, cọ xát liên tục vào thành chuồng hoặc nền chuồng không?').
symptom(sym_da_vay_dom, 'Da lợn có vảy đóng mảng, dày sừng hoặc đóng mài toàn thân không?').
symptom(sym_watery_diarrhea_postweaning, 'Lợn cai sữa hoặc lợn thịt có tiêu chảy nước kéo dài, giảm ăn và chậm lớn không?').
symptom(sym_high_mortality_young, 'Heo con có tỷ lệ chết cao trong ổ, đặc biệt sau sinh hoặc sau cai sữa không?').
symptom(sym_lay_lan_nhanh, 'Benh co lay lan rat nhanh toan dan khong?').
symptom(sym_chet_nhanh_hang_loat, 'Heo chet hang loat, ty le chet rat cao trong 1-3 ngay khong?').
symptom(sym_da_vong_tron_hong, 'Da lợn có các vòng tròn hồng/đỏ, rìa nổi viền rõ, lan rộng dần ra xung quanh không?').
symptom(sym_da_vay_tron_rung_long, 'Da lợn có vảy tròn, rụng lông thành mảng tròn, ngứa nhẹ (nấm vòng) không?').
symptom(sym_mun_dau_mu_dong_vay, 'Da lợn có mụn nước nhỏ → vỡ → đóng vảy nâu đen rải rác khắp thân không?').
symptom(sym_da_bong_ro_vung_ho, 'Vùng da hở (tai, lưng) có đỏ tấy, phồng rộp, bong tróc sau khi tiếp xúc nắng gay gắt không?').
symptom(sym_da_viem_do_nut_moi, 'Da lợn có viêm đỏ, nứt nẻ, ẩm ướt ở vùng tiếp xúc đất/nền ẩm (bụng, khoeo chân) không?').

disease(dis_ecoli_diarrhea, 'Tiêu chảy do E. coli', 'enteric_preweaning', 'sơ sinh - sau cai sữa', 'Phân trắng/vàng, phân sống, mất nước nhanh.', 'E. coli sinh độc tố gây viêm ruột.', 'Giữ ấm, vệ sinh chuồng đẻ, đảm bảo bú sữa đầu.', 'Bù nước - điện giải, giữ ấm, dùng kháng sinh/điều trị theo phác đồ thú y nếu xác định nhiễm khuẩn.', 0.5).
disease(dis_clostridium, 'Tiêu chảy ra máu do Clostridium perfringens', 'enteric_preweaning', 'heo con sơ sinh', 'Tiêu chảy ra máu tươi/nâu, chết nhanh.', 'Clostridium perfringens type A/C và độc tố ruột.', 'Vệ sinh sát trùng chuồng đẻ, kiểm soát sữa đầu và môi trường ổ đẻ.', 'Can thiệp sớm, bù dịch, kháng sinh theo chỉ định thú y, cách ly ổ bệnh.', 0.6).
disease(dis_coccidiosis, 'Tiêu chảy do cầu trùng', 'enteric_preweaning', '7-36 ngày', 'Phân vàng sệt, mùi tanh, heo lông xù, ít sốt.', 'Ký sinh trùng cầu trùng.', 'Sát trùng nền chuồng, giữ nền khô, vệ sinh ô đẻ.', 'Dùng thuốc đặc trị cầu trùng theo hướng dẫn thú y và bù nước.', 0.6).
disease(dis_ped_tge, 'PED/TGE', 'enteric_preweaning', 'heo con mọi lứa', 'Tiêu chảy nước, ói mửa, mất nước mạnh, lây lan nhanh.', 'Virus PED/TGE.', 'An toàn sinh học, vaccine nái nếu chương trình trại có áp dụng.', 'Điều trị hỗ trợ: điện giải, giữ ấm, hạn chế mất nước; kháng sinh chỉ dùng khi có bội nhiễm và theo thú y.', 0.7).
disease(dis_ecoli_edema, 'Bệnh phù đầu do E. coli', 'post_weaning_enteric_systemic', 'heo cai sữa', 'Phù mí mắt, lảo đảo, khản giọng, co giật, chết nhanh.', 'Độc tố E. coli sau cai sữa.', 'Tập ăn sớm, giảm stress, không đổi thức ăn đột ngột.', 'Giảm khẩu phần, bù điện giải, kháng sinh và chống viêm theo thú y.', 0.75).
disease(dis_salmonella, 'Phó thương hàn (Salmonella)', 'systemic', 'heo cai sữa - heo thịt', 'Sốt, táo bón rồi tiêu chảy hôi, tím tai/bụng.', 'Salmonella spp.', 'Sát trùng, cách ly, giảm mật độ, quản lý thức ăn và nước uống.', 'Điều trị sớm, hỗ trợ hạ sốt/bù nước và kháng sinh theo kháng sinh đồ nếu có.', 0.7).
disease(dis_staph_hyicus, 'Viêm da tiết dịch', 'skin', 'heo con', 'Da sậm màu, tiết dịch nhớt, đóng vảy đen.', 'Staphylococcus hyicus xâm nhập qua vết trầy xước.', 'Tránh trầy xước, giảm sắc nhọn nền chuồng, sát trùng.', 'Sát trùng da, kháng sinh và chống viêm theo hướng dẫn thú y, chăm sóc dinh dưỡng.', 0.8).
disease(dis_bordetella, 'Viêm teo mũi truyền nhiễm', 'respiratory', 'heo con - heo hậu bị', 'Hắt hơi, chảy nước mắt/nước mũi, chậm lớn; nặng có biến dạng mõm và chảy máu mũi.', 'Bordetella bronchiseptica, thường phối hợp toxigenic Pasteurella multocida.', 'Giữ ấm, giảm bụi khí, vaccine và quản lý thông thoáng.', 'Điều trị nhiễm khuẩn hô hấp theo thú y, kiểm soát bội nhiễm và cải thiện môi trường.', 0.75).
disease(dis_mycoplasma, 'Suyễn lợn', 'respiratory', 'heo cai sữa - heo thịt', 'Ho khan kéo dài, chậm lớn.', 'Mycoplasma hyopneumoniae.', 'Thông thoáng, giảm bụi, vaccine nếu trại có chương trình.', 'Kháng sinh phù hợp, kiểm soát bội nhiễm, tối ưu môi trường chuồng nuôi.', 0.7).
disease(dis_pasteurella, 'Viêm phổi cấp / tụ huyết trùng do Pasteurella', 'respiratory', 'heo thịt', 'Sốt cao, khó thở, xuất huyết da, có thể chết đột ngột.', 'Pasteurella multocida, thường là tác nhân cơ hội sau tổn thương hô hấp.', 'Giảm stress, kiểm soát bệnh nền hô hấp, thông thoáng chuồng.', 'Điều trị nhiễm khuẩn hô hấp và chống viêm/hạ sốt theo thú y.', 0.75).
disease(dis_app, 'Viêm phổi màng phổi (APP)', 'respiratory', 'heo cai sữa - heo thịt', 'Sốt rất cao, khó thở dữ dội, sùi bọt máu ở mũi miệng, tím tái.', 'Actinobacillus pleuropneumoniae.', 'Mật độ nuôi hợp lý, thông thoáng, an toàn sinh học.', 'Can thiệp khẩn cấp, kháng sinh đặc hiệu theo thú y, trợ sức và giảm stress hô hấp.', 0.85).
disease(dis_prrs, 'Tai xanh (PRRS)', 'multisystemic', 'mọi lứa, đặc biệt nái và heo cai sữa', 'Sốt cao, tai tím xanh, khó thở; nái có sảy thai và đẻ yếu.', 'Virus PRRS.', 'Vaccine theo chương trình trại, an toàn sinh học nghiêm ngặt.', 'Chủ yếu điều trị triệu chứng, kiểm soát bội nhiễm và theo dõi sinh sản đàn nái.', 0.8).
disease(dis_asf, 'Dịch tả lợn Châu Phi (ASF)', 'transboundary', 'mọi lứa', 'Sốt cao, xuất huyết, lách to, chết nhanh.', 'ASFV (virus Dịch tả lợn Châu Phi).', 'An toàn sinh học tuyệt đối, khử trùng, kiểm soát vận chuyển và thức ăn thừa.', 'Không có thuốc điều trị đặc hiệu; xử lý theo quy định thú y và an toàn sinh học.', 0.9).
disease(dis_erysipelas, 'Đóng dấu son', 'systemic', 'heo thịt - nái', 'Sốt cao, dấu đỏ/tím hình thoi trên da, có thể sưng khớp.', 'Erysipelothrix rhusiopathiae.', 'Vaccine, sát trùng, giảm stress.', 'Kháng sinh theo thú y, hạ sốt và trợ sức.', 0.85).
disease(dis_mma, 'MMA (viêm vú - viêm tử cung - mất sữa)', 'reproductive', 'heo nái sau sinh', 'Sốt, vú sưng đỏ tím, dịch âm đạo có máu, mất sữa.', 'Nhiễm khuẩn hậu sản, sót nhau, stress.', 'Chuồng đẻ sạch, chăm sóc sau đẻ tốt, giảm stress.', 'Vệ sinh, tống sữa viêm, hỗ trợ oxytocin, kháng sinh và hạ sốt theo thú y.', 0.9).
disease(dis_fmd, 'Lở mồm long móng (FMD)', 'transboundary', 'mọi lứa', 'Mụn nước ở mõm/kẽ móng, loét, đi thọt, sùi bọt mép.', 'Virus FMD.', 'Vaccine và kiểm soát tiếp xúc/di chuyển đàn.', 'Điều trị triệu chứng, sát trùng vết loét, giảm đau và ngừa bội nhiễm theo thú y.', 0.85).
disease(dis_csf, 'Dịch tả lợn cổ điển (CSF)', 'transboundary', 'mọi lứa', 'Sốt cao, xuất huyết, táo bón rồi tiêu chảy, có thể triệu chứng thần kinh.', 'Pestivirus.', 'Vaccine, cách ly, giám sát đàn.', 'Không điều trị đặc hiệu; xử lý theo quy định thú y và kiểm soát ổ dịch.', 0.75).
disease(dis_streptococcus, 'Streptococcus suis', 'systemic', 'heo cai sữa - heo thịt', 'Sốt, sưng khớp, đi vòng tròn, co giật, bơi chèo.', 'Streptococcus suis.', 'Vệ sinh, giảm mật độ, giảm stress, kiểm soát lây sang người.', 'Điều trị càng sớm càng tốt bằng kháng sinh phù hợp và cách ly an toàn.', 0.75).
disease(dis_swine_influenza, 'Cúm heo', 'respiratory', 'mọi lứa, thường heo thịt', 'Khởi phát rất nhanh, ho cấp tính, sốt, chảy nước mũi, cả đàn bệnh đồng loạt.', 'Virus cúm A ở heo.', 'Thông thoáng, giảm stress, vaccine theo biến chủng lưu hành.', 'Điều trị hỗ trợ, giảm sốt và ngừa bội nhiễm; kiểm soát đàn và vệ sinh chuồng.', 0.8).
disease(dis_atrophic_rhinitis, 'Viêm teo mũi', 'respiratory', 'heo con - heo hậu bị', 'Hắt hơi, chảy máu mũi, giảm tăng trọng, mõm biến dạng.', 'Toxigenic Pasteurella multocida, thường phối hợp Bordetella bronchiseptica.', 'Vaccine, quản lý bụi khí, chuồng sạch và thoáng.', 'Điều trị nhiễm khuẩn hô hấp và kiểm soát tác nhân nền, đặc biệt trong đàn giống.', 0.8).
disease(dis_pcvad, 'Bệnh do Circovirus heo (PCVAD / PMWS)', 'multisystemic', 'heo cai sữa - heo thịt', 'Sút cân, chậm lớn, ho, vàng da/pallor, hạch to, suy kiệt.', 'Porcine circovirus type 2 (PCV2) và các bội nhiễm đi kèm.', 'Vaccine PCV2, giảm mật độ, kiểm soát bội nhiễm và stress.', 'Không có thuốc đặc hiệu; tập trung kiểm soát bội nhiễm, dinh dưỡng và an toàn sinh học.', 0.75).
disease(dis_swine_dysentery, 'Lỵ heo / Swine dysentery', 'enteric_postweaning', 'heo cai sữa - heo thịt', 'Tiêu chảy nhầy máu, hôi, mất nước, sụt cân.', 'Brachyspira hyodysenteriae và các loài Brachyspira liên quan.', 'An toàn sinh học, quản lý phân - nước - xe cộ, cùng vào cùng ra.', 'Điều trị sớm theo kháng sinh đồ nếu có, bù nước và cách ly đàn bệnh.', 0.85).
disease(dis_ileitis, 'Viêm hồi tràng / Ileitis', 'enteric_postweaning', 'heo cai sữa - heo thịt', 'Tiêu chảy kéo dài, giảm ăn, chậm lớn, có thể xuất huyết ruột.', 'Lawsonia intracellularis.', 'Vaccine nếu có chương trình, giảm stress và tối ưu vệ sinh.', 'Điều trị theo thú y, bù nước và kiểm soát bội nhiễm; theo dõi tăng trọng.', 0.8).
disease(dis_glasser, 'Bệnh Glässer', 'systemic', 'heo cai sữa - heo thịt', 'Sốt rất cao, khó thở kiểu bụng, sưng khớp, dấu thần kinh, chết nhanh.', 'Glaesserella parasuis.', 'Giảm stress, thông thoáng, kiểm soát PRRS/PCV2, vaccine nếu phù hợp.', 'Điều trị sớm bằng kháng sinh phù hợp và hỗ trợ hô hấp, khớp, giảm viêm.', 0.8).
disease(dis_porcine_parvovirus, 'Parvovirus heo', 'reproductive', 'heo nái hậu bị - nái tơ', 'Đẻ ít con, thai chết lưu, thai khô, heo con dị hình kích cỡ khác nhau.', 'Porcine parvovirus.', 'Vaccine trước phối giống, quản lý đàn hậu bị.', 'Không có điều trị đặc hiệu; phòng là chính bằng vaccine và quản lý sinh sản.', 0.85).
disease(dis_leptospirosis, 'Leptospirosis', 'reproductive', 'nái sinh sản', 'Sảy thai, thai chết lưu, heo con yếu, vô sinh tạm thời.', 'Leptospira interrogans và các serovar liên quan.', 'Vaccine đa giá, kiểm soát nước bẩn/chuột, vệ sinh sinh sản.', 'Điều trị và kiểm soát đàn theo thú y; lưu ý đây là bệnh lây sang người.', 0.8).
disease(dis_pseudorabies, 'Giả dại (Aujeszky)', 'transboundary', 'heo con, heo nái', 'Sốt, ho, thần kinh, ngứa dữ dội ở heo con; heo nái có thể sảy thai.', 'Porcine herpesvirus 1.', 'Giám sát dịch tễ, vaccine nếu chương trình trại áp dụng và theo quy định địa phương.', 'Không có điều trị đặc hiệu; cách ly và kiểm soát đàn.', 0.8).
disease(dis_rotavirus, 'Tiêu chảy do Rotavirus', 'enteric_preweaning', 'heo sơ sinh - cai sữa', 'Tiêu chảy nước, mất nước vừa đến nặng, tăng chết ở heo con.', 'Rotavirus nhóm A/B/C/D.', 'Vệ sinh chuồng đẻ, sữa đầu, an toàn sinh học.', 'Bù nước - điện giải, giữ ấm, chăm sóc hỗ trợ; kháng sinh chỉ khi có bội nhiễm.', 0.7).
disease(dis_sarcoptic_mange, 'Ghẻ Sarcoptes', 'skin', 'mọi lứa', 'Ngứa dữ dội, cọ xát, đóng vảy, dày sừng.', 'Sarcoptes scabiei var. suis.', 'Tẩy ghẻ định kỳ, vệ sinh chuồng, cách ly đàn mới nhập.', 'Điều trị ký sinh trùng theo thú y cho cả đàn liên quan và xử lý môi trường.', 0.85).
disease(dis_greasy_pig, 'Bệnh heo da dầu (Exudative epidermitis)', 'skin', 'heo con', 'Da ẩm nhớt, nâu đen, mùi hôi, heo yếu nhanh.', 'Staphylococcus hyicus sinh độc tố.', 'Giảm trầy xước, vệ sinh chuồng và kiểm soát bội nhiễm.', 'Kháng sinh, sát trùng và chăm sóc da theo thú y.', 0.8).
disease(dis_env_dermatitis, 'Viêm da do môi trường', 'skin', 'mọi lứa', 'Da viêm đỏ, nứt nẻ, ẩm ướt ở vùng tiếp xúc nền chuồng bẩn.', 'Tiếp xúc kéo dài với nền ẩm, phân nước hoặc chất kích ứng.', 'Giữ nền chuồng khô ráo sạch sẽ; giảm mật độ nuôi; vệ sinh định kỳ.', 'Làm sạch và sát trùng vùng da tổn thương, bôi kem kháng viêm/kháng khuẩn theo thú y; cải thiện môi trường nuôi.', 0.65).
disease(dis_sunburn, 'Cháy nắng trên da (Sunburn)', 'skin', 'mọi lứa, đặc biệt lợn da trắng/hồng', 'Da đỏ, phồng rộp, bong tróc ở vùng hở sau tiếp xúc nắng mạnh.', 'Bức xạ UV cường độ cao chiếu trực tiếp lên da thiếu sắc tố melanin.', 'Cung cấp bóng râm đầy đủ, tránh chăn thả lúc nắng gắt 10h-15h.', 'Chuyển lợn vào bóng râm ngay; chườm mát; bôi thuốc làm dịu và chống nhiễm trùng vết phồng rộp.', 0.70).
disease(dis_pityriasis_rosea, 'Nấm hồng da (Pityriasis Rosea)', 'skin', 'heo con - heo thịt (dưới 14 tuần)', 'Các vòng tròn hồng/đỏ nổi rõ rìa, lan ra ngoài, thường ở bụng và sườn.', 'Nguyên nhân chưa rõ; nghi liên quan yếu tố di truyền và một số virus.', 'Không có biện pháp phòng đặc hiệu; vệ sinh chuồng và giảm stress.', 'Thường tự khỏi trong 6-8 tuần. Điều trị hỗ trợ: giữ da sạch, tránh bội nhiễm.', 0.65).
disease(dis_ringworm, 'Nấm da hắc lào (Dermatophytosis)', 'skin', 'mọi lứa', 'Vảy tròn rụng lông thành mảng, ngứa nhẹ, lan rộng dần.', 'Nấm Microsporum hoặc Trichophyton xâm nhiễm lớp keratin da và lông.', 'Cách ly lợn mới nhập, vệ sinh dụng cụ chăm sóc; tránh độ ẩm cao kéo dài.', 'Điều trị nấm bằng thuốc chống nấm (griseofulvin, itraconazole) theo thú y; sát trùng dụng cụ và chuồng trại.', 0.70).
disease(dis_swinepox, 'Đậu mùa lợn (Swinepox)', 'skin', 'heo con - heo thịt', 'Mụn nước nhỏ → đóng vảy nâu đen rải rác toàn thân, có thể kèm sốt nhẹ.', 'Swinepox virus (Suipoxvirus), lây qua tiếp xúc trực tiếp hoặc ký sinh trùng (rận heo).', 'Kiểm soát ký sinh trùng (rận, ghẻ); vệ sinh chuồng; cách ly lợn bệnh.', 'Không có thuốc đặc hiệu; điều trị hỗ trợ, ngăn bội nhiễm bằng sát trùng da và kháng sinh tại chỗ nếu cần.', 0.75).
% ===================================================================
% 4. TẬP LUẬT CÓ TRỌNG SỐ (PRIORITY) & SOFT RULES
% ===================================================================
rule('R_ASF_Epidemic', [sym_lay_lan_nhanh, sym_chet_nhanh_hang_loat, sym_xuat_huyet_da], dis_asf, 0.99, 3).
rule('R_ASF_Main', [sym_sot_rat_cao, sym_xuat_huyet_da, sym_tai_bung_tim_xanh], dis_asf, 0.90, 2).
rule('R_ASF_Soft1', [sym_sot_rat_cao, sym_xuat_huyet_da], dis_asf, 0.75, 1).
rule('R_ASF_Soft2', [sym_sot_rat_cao, sym_tai_bung_tim_xanh], dis_asf, 0.70, 1).

% ASF chết cực nhanh (phân biệt epidemiology)
rule('R_ASF_DeathFast', [sym_chet_nhanh_hang_loat], dis_asf, 0.95, 3).

rule('R_PRRS_Epidemic', [sym_lay_lan_nhanh, sym_sot_rat_cao, sym_tai_bung_tim_xanh, sym_kho_tho_the_bung], dis_prrs, 0.95, 3).
rule('R_PRRS_Main', [sym_sot_rat_cao, sym_kho_tho_the_bung, sym_tai_bung_tim_xanh], dis_prrs, 0.85, 2).
rule('R_PRRS_Soft', [sym_sot_vua_den_cao, sym_tai_bung_tim_xanh], dis_prrs, 0.65, 1).

rule('R_Glasser_Main', [sym_sot_rat_cao, sym_kho_tho_the_bung, sym_sung_khop], dis_glasser, 0.90, 2).
rule('R_Strep_Main', [sym_sot_rat_cao, sym_trieu_chung_than_kinh, sym_sung_khop], dis_streptococcus, 0.90, 2).
rule('R_Strep_Soft', [sym_sot_rat_cao, sym_trieu_chung_than_kinh], dis_streptococcus, 0.75, 1).

rule('R_FMD_Epidemic', [sym_lay_lan_nhanh, sym_mun_nuoc_mong_mieng], dis_fmd, 0.98, 3).
rule('R_FMD_Main', [sym_sot_vua_den_cao, sym_mun_nuoc_mong_mieng], dis_fmd, 0.90, 2).

rule('R_Ecoli_Diar', [sym_tieu_chay_trang_vang_song], dis_ecoli_diarrhea, 0.8, 2).
rule('R_Clostridium', [sym_tieu_chay_mau], dis_clostridium, 0.95, 2).
rule('R_Cocci', [sym_tieu_chay_vang_set_tanh], dis_coccidiosis, 0.85, 2).
rule('R_PED', [sym_tieu_chay_nuoc_oi, sym_lay_lan_nhanh], dis_ped_tge, 0.95, 3).
rule('R_Ecoli_Edema', [sym_phu_mi_mat_co_giat], dis_ecoli_edema, 0.85, 2).
rule('R_Salmo', [sym_sot_vua_den_cao, sym_tai_bung_tim_xanh, sym_tieu_chay_trang_vang_song], dis_salmonella, 0.8, 2).
rule('R_Staph', [sym_da_do_tiet_dich_nhot], dis_staph_hyicus, 0.95, 2).
rule('R_Myco', [sym_ho_keo_dai], dis_mycoplasma, 0.75, 2).
rule('R_Pasteurella', [sym_sot_vua_den_cao, sym_kho_tho_the_bung, sym_xuat_huyet_da], dis_pasteurella, 0.85, 2).
rule('R_APP', [sym_sot_rat_cao, sym_sui_bot_mau_mui, sym_kho_tho_the_bung], dis_app, 0.95, 3).
rule('R_Bordetella_Main', [sym_khit_mui_chay_nuoc_mat, sym_chay_nuoc_mui, sym_giam_tang_truong], dis_bordetella, 0.86, 2).
rule('R_Bordetella_Soft', [sym_khit_mui_chay_nuoc_mat, sym_chay_nuoc_mui], dis_bordetella, 0.72, 1).
rule('R_Atrophic_Main', [sym_khit_mui_chay_nuoc_mat, sym_snout_deform, sym_nose_bleed], dis_atrophic_rhinitis, 0.92, 3).
rule('R_Atrophic_Soft', [sym_snout_deform, sym_nose_bleed], dis_atrophic_rhinitis, 0.82, 2).
rule('R_Flu_Epidemic', [sym_sot_dot_ngot, sym_ho_cap_tinh, sym_chay_nuoc_mui], dis_swine_influenza, 0.90, 3).
rule('R_Flu_Soft', [sym_sot_dot_ngot, sym_ho_cap_tinh], dis_swine_influenza, 0.78, 2).

rule('R_Dysentery_Main', [sym_phan_nhot_mau, sym_sut_can], dis_swine_dysentery, 0.90, 2).
rule('R_Dysentery_Soft', [sym_phan_nhot_mau, sym_watery_diarrhea_postweaning], dis_swine_dysentery, 0.78, 1).
rule('R_Ileitis_Main', [sym_watery_diarrhea_postweaning, sym_giam_tang_truong], dis_ileitis, 0.82, 2).
rule('R_Ileitis_Soft', [sym_watery_diarrhea_postweaning, sym_sut_can], dis_ileitis, 0.74, 1).
rule('R_Rotavirus_Main', [sym_tieu_chay_nuoc_oi, sym_high_mortality_young], dis_rotavirus, 0.78, 2).
rule('R_Rotavirus_Soft', [sym_tieu_chay_nuoc_oi, sym_tieu_chay_trang_vang_song], dis_rotavirus, 0.70, 1).
rule('R_PCVAD_Main', [sym_sut_can, sym_giam_tang_truong, sym_ho_keo_dai], dis_pcvad, 0.82, 2).
rule('R_PCVAD_Soft', [sym_sut_can, sym_giam_tang_truong], dis_pcvad, 0.72, 1).

rule('R_Parvo_Main', [sym_abortions, sym_mum_con_stillborn, sym_weak_piglets], dis_porcine_parvovirus, 0.90, 3).
rule('R_Parvo_Soft', [sym_mum_con_stillborn, sym_weak_piglets], dis_porcine_parvovirus, 0.82, 2).
rule('R_Lepto_Main', [sym_abortions, sym_mum_con_stillborn], dis_leptospirosis, 0.85, 2).
rule('R_Lepto_Soft', [sym_abortions, sym_weak_piglets], dis_leptospirosis, 0.78, 2).

rule('R_Pseudo_Main', [sym_trieu_chung_than_kinh, sym_sot_rat_cao, sym_ngua_du_doi], dis_pseudorabies, 0.85, 3).
rule('R_Pseudo_Soft', [sym_trieu_chung_than_kinh, sym_ngua_du_doi], dis_pseudorabies, 0.76, 2).

rule('R_Mange_Main', [sym_ngua_du_doi, sym_da_vay_dom], dis_sarcoptic_mange, 0.90, 2).
rule('R_Mange_Soft', [sym_ngua_du_doi], dis_sarcoptic_mange, 0.68, 1).
rule('R_GreasyPig_Main', [sym_da_do_tiet_dich_nhot, sym_sut_can], dis_greasy_pig, 0.82, 2).
rule('R_GreasyPig_Soft', [sym_da_do_tiet_dich_nhot, sym_high_mortality_young], dis_greasy_pig, 0.75, 1).

rule('R_Ery', [sym_sot_rat_cao, sym_ban_hinh_vuong_thoi], dis_erysipelas, 0.98, 3).
rule('R_MMA', [sym_viem_vu_viem_tu_cung], dis_mma, 0.98, 3).
rule('R_CSF', [sym_sot_rat_cao, sym_xuat_huyet_da, sym_tieu_chay_trang_vang_song], dis_csf, 0.75, 2).

% Thêm rule CSF phân biệt (tri thức dịch tễ học)
rule('R_CSF_Chronic', [sym_tieu_chay_trang_vang_song], dis_csf, 0.6, 1).

% --- Skin Diseases (AI ProtoNet Mapped) ---
rule('R_EnvDermatitis_Main', [sym_da_viem_do_nut_moi], dis_env_dermatitis, 0.85, 2).
rule('R_EnvDermatitis_Soft', [sym_da_do_tiet_dich_nhot, sym_da_viem_do_nut_moi], dis_env_dermatitis, 0.88, 2).

rule('R_Sunburn_Main', [sym_da_bong_ro_vung_ho], dis_sunburn, 0.90, 2).
rule('R_Sunburn_Soft', [sym_da_bong_ro_vung_ho, sym_sot_vua_den_cao], dis_sunburn, 0.80, 1).

rule('R_Pityriasis_Main', [sym_da_vong_tron_hong], dis_pityriasis_rosea, 0.88, 2).

rule('R_Ringworm_Main', [sym_da_vay_tron_rung_long], dis_ringworm, 0.90, 2).
rule('R_Ringworm_Strong', [sym_da_vay_tron_rung_long, sym_ngua_du_doi], dis_ringworm, 0.93, 2).

rule('R_Swinepox_Main', [sym_mun_dau_mu_dong_vay], dis_swinepox, 0.88, 2).
rule('R_Swinepox_Strong', [sym_mun_dau_mu_dong_vay, sym_sot_vua_den_cao], dis_swinepox, 0.92, 3).

% ===================================================================
% 5. ĐỘNG CƠ SUY LUẬN (INFERENCE ENGINE - ULTIMATE LEVEL)
% ===================================================================

disease_threshold(DiseaseId, Threshold) :-
    disease(DiseaseId, _, _, _, _, _, _, _, Threshold).

% --- FIX 2: Xử lý triệu chứng không biết & Negative Evidence ---
% Nếu có dữ liệu (có thể là âm), lấy dữ liệu đó. Cắt nhánh (!).
has_symptom(S, CF) :- known(S, CF), !.
% Nếu CHƯA HỎI, mặc định CF = 0.
has_symptom(_, 0.0).

% Kiểm tra danh sách triệu chứng (Lấy Min để thỏa mãn cổng AND)
check_symptoms([], 1.0).
check_symptoms([H|T], MinCF) :-
    has_symptom(H, CF1),
    check_symptoms(T, CF2),
    PosCF1 is max(0.0, CF1), % Ép giá trị âm về 0 để không phá vỡ logic rule
    PosCF2 is max(0.0, CF2),
    MinCF is min(PosCF1, PosCF2).

% ===================================================================
% 5A. SUY DIỄN LÙI CHO HỎI ĐÁP ĐỘNG (BACKWARD QUESTIONING)
% ===================================================================

unknown_symptom(S) :- \+ known(S, _).
positive_symptom(S) :- known(S, CF), CF > 0.0.
negative_symptom(S) :- known(S, CF), CF < -0.2.

count_positive([], 0).
count_positive([H|T], Count) :-
    count_positive(T, Rest),
    (positive_symptom(H) -> Count is Rest + 1 ; Count is Rest).

count_unknown([], 0).
count_unknown([H|T], Count) :-
    count_unknown(T, Rest),
    (unknown_symptom(H) -> Count is Rest + 1 ; Count is Rest).

has_negative([H|_]) :- negative_symptom(H), !.
has_negative([_|T]) :- has_negative(T).

% Chọn một tiền đề còn thiếu của luật đang hỗ trợ một giả thuyết bệnh.
% Đây là dạng suy diễn lùi thực dụng: bắt đầu từ Disease, quay ngược về các
% Symptoms còn thiếu trong luật để sinh câu hỏi tiếp theo.
backward_question_candidate(Disease, RuleId, MissingSymptom, Score) :-
    rule(RuleId, Symptoms, Disease, RuleCF, Priority),
    \+ has_negative(Symptoms),
    member(MissingSymptom, Symptoms),
    unknown_symptom(MissingSymptom),
    count_positive(Symptoms, PositiveCount),
    PositiveCount > 0,
    count_unknown(Symptoms, UnknownCount),
    length(Symptoms, TotalCount),
    TotalCount > 0,
    priority_weight(Priority, PriorityWeight),
    CompletionScore is PositiveCount / TotalCount,
    RuleStrength is RuleCF * PriorityWeight,
    NeedScore is 1.0 / (UnknownCount + 1),
    Score is CompletionScore + RuleStrength + NeedScore.

backward_next_question(SymptomId, Disease, RuleId, Score) :-
    findall(NegScore-S-D-R,
            (backward_question_candidate(D, R, S, CandidateScore),
             NegScore is -CandidateScore),
            Candidates),
    Candidates \= [],
    keysort(Candidates, SortedCandidates),
    SortedCandidates = [BestNegScore-SymptomId-Disease-RuleId|_],
    Score is -BestNegScore.

% --- FIX 1 & 4: Tính toán CF cho 1 luật, kèm Priority và loại Nhiễu ---
diagnose_rule(Disease, RuleId, CF_rule_final) :-
    rule(RuleId, Symptoms, Disease, CF_rule_base, Priority),
    check_symptoms(Symptoms, CF_symptoms),
    
    % Tính CF thô
    CF_temp is CF_rule_base * CF_symptoms,
    
    % Lấy trọng số Priority từ cấu hình (không hard-code)
    priority_weight(Priority, PriorityWeight),
    CF_raw is CF_temp * PriorityWeight,
    
    % Clamp (giới hạn CF) không cho vượt quá 1.0 hoặc -1.0
    (CF_raw > 1.0 -> CF_clamped = 1.0 ;
     CF_raw < -1.0 -> CF_clamped = -1.0 ;
     CF_clamped = CF_raw),
     
    CF_rule_final = CF_clamped,
    
    % Loại bỏ Noisy Rule (Chỉ lấy luật có sức ảnh hưởng đáng kể |CF| >= 0.2) và cut để tránh backtracking dư
    abs(CF_rule_final) >= 0.2.

% --- CÔNG THỨC KẾT HỢP CF CHUẨN CỦA MYCIN ---
% Cùng dấu dương: CF1 + CF2 - (CF1 * CF2)
combine_cf(CF1, CF2, CF) :-
    CF1 >= 0, CF2 >= 0, !,
    CF is CF1 + CF2 - (CF1 * CF2).

% Cùng dấu âm: CF1 + CF2 + (CF1 * CF2)
combine_cf(CF1, CF2, CF) :-
    CF1 < 0, CF2 < 0, !,
    CF is CF1 + CF2 + (CF1 * CF2).

% Trái dấu: (CF1 + CF2) / (1 - min(|CF1|, |CF2|))
combine_cf(CF1, CF2, CF) :-
    MinAbs is min(abs(CF1), abs(CF2)),
    (MinAbs =:= 1.0 -> CF is 0.0 ; CF is (CF1 + CF2) / (1.0 - MinAbs)).

% Gom danh sách CF lại thành 1 CF duy nhất
combine_list([], 0.0).
combine_list([H|T], Result) :-
    combine_list_helper(T, H, Result).

combine_list_helper([], Current, Current).
combine_list_helper([H|T], Current, Result) :-
    combine_cf(Current, H, Next),
    combine_list_helper(T, Next, Result).

% --- FIX 5: Gộp CF theo Bệnh & Bổ sung Explainability (Giải thích) ---
% Trả về Disease, Tổng CF, và Danh sách các Rule đã kích hoạt
collect_disease_cf(Disease, CF_final, TriggeredRules) :-
    disease(Disease, _, _, _, _, _, _, _, _), % Bind từng bệnh
    % Tìm tất cả các Cặp (CF - RuleId) của bệnh này
    findall(CF-RuleId, diagnose_rule(Disease, RuleId, CF), Results),
    Results \= [], % Phải có ít nhất 1 luật kích hoạt
    
    % Tách riêng mảng CF và mảng RuleId
    extract_cfs(Results, CFList),
    extract_rules(Results, TriggeredRules),
    
    % Kết hợp toàn bộ CFList
    combine_list(CFList, CF_final).

% Hàm hỗ trợ tách dữ liệu
extract_cfs([], []).
extract_cfs([CF-_|T], [CF|TR]) :- extract_cfs(T, TR).

extract_rules([], []).
extract_rules([_-Rule|T], [Rule|TR]) :- extract_rules(T, TR).

% --- Bộ lọc Threshold ---
diagnose_filtered(Disease, CF, TriggeredRules) :-
    collect_disease_cf(Disease, CF, TriggeredRules),
    disease_threshold(Disease, Threshold),
    CF >= Threshold.

% --- Sắp xếp (Sort) kết quả giảm dần ---
diagnose_all(SortedResult) :-
    % Tạo list dạng: NegCF - Disease - TriggeredRules (Dùng NegCF để sort giảm dần)
    findall(NegCF-Disease-Rules, 
            (diagnose_filtered(Disease, CF, Rules), NegCF is -CF), 
            NegList),
    keysort(NegList, SortedNegList),
    format_result(SortedNegList, SortedResult).

% Format lại kết quả cho Python dễ đọc: trả về mảng Tuple (Disease, CF, Rules)
format_result([], []).
format_result([NegCF-Disease-Rules | T], [[Disease, CF, Rules] | TRest]) :-
    CF is -NegCF,
    CF > 0.0,
    format_result(T, TRest).
