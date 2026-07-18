import type { Metadata } from "next";
import { LegalLayout, LegalSection, LegalCallout } from "@/components/legal/legal-layout";

export const metadata: Metadata = {
  title: "Điều khoản dịch vụ",
  description:
    "Điều khoản dịch vụ của Wavise Studio — quyền và nghĩa vụ khi sử dụng nền tảng tạo video AI.",
  robots: { index: true, follow: true },
};

const toc = [
  { id: "gioi-thieu", label: "1. Giới thiệu & chấp nhận điều khoản" },
  { id: "tai-khoan", label: "2. Tài khoản người dùng" },
  { id: "dich-vu", label: "3. Mô tả dịch vụ" },
  { id: "credit-thanh-toan", label: "4. Credit & thanh toán" },
  { id: "hanh-vi-cam", label: "5. Nội dung & hành vi bị cấm" },
  { id: "so-huu-ban-quyen", label: "6. Quyền sở hữu & giấy phép nội dung" },
  { id: "trach-nhiem-ai", label: "7. Nội dung do AI tạo & trách nhiệm" },
  { id: "gioi-han-trach-nhiem", label: "8. Giới hạn trách nhiệm" },
  { id: "cham-dut", label: "9. Đình chỉ & chấm dứt tài khoản" },
  { id: "thay-doi", label: "10. Thay đổi điều khoản" },
  { id: "lien-he", label: "11. Luật áp dụng & liên hệ" },
];

export default function TermsOfServicePage() {
  return (
    <LegalLayout
      title="Điều khoản dịch vụ"
      intro="Điều khoản này quy định các điều kiện sử dụng nền tảng Wavise Studio (“Dịch vụ”). Vui lòng đọc kỹ trước khi sử dụng. Bằng việc đăng ký hoặc sử dụng Dịch vụ, bạn đồng ý với toàn bộ các điều khoản dưới đây."
      effectiveDate="[NGÀY HIỆU LỰC]"
      toc={toc}
    >
      <LegalCallout>
        <strong>Bản nháp cần rà soát pháp lý.</strong> Tài liệu này là bản mẫu để chủ sở hữu điền
        thông tin và tham vấn luật sư trước khi công bố chính thức. Các mục trong ngoặc vuông in hoa
        (ví dụ [TÊN CÔNG TY]) cần được thay bằng thông tin thực tế.
      </LegalCallout>

      <LegalSection id="gioi-thieu" index={1} title="Giới thiệu & chấp nhận điều khoản">
        <p>
          Wavise Studio là nền tảng phần mềm dịch vụ (SaaS) cho phép người dùng tạo video ngắn bằng
          trí tuệ nhân tạo (AI), được vận hành bởi <strong>[TÊN CÔNG TY]</strong>, mã số thuế{" "}
          <strong>[MÃ SỐ THUẾ]</strong>, địa chỉ <strong>[ĐỊA CHỈ]</strong> (“chúng tôi”).
        </p>
        <p>
          Bằng việc tạo tài khoản, truy cập hoặc sử dụng Dịch vụ, bạn xác nhận đã đọc, hiểu và đồng ý
          bị ràng buộc bởi Điều khoản dịch vụ này cùng{" "}
          <a href="/chinh-sach-bao-mat">Chính sách bảo mật</a> và{" "}
          <a href="/chinh-sach-hoan-tien">Chính sách hoàn tiền &amp; credit</a>. Nếu bạn không đồng ý,
          vui lòng ngừng sử dụng Dịch vụ.
        </p>
      </LegalSection>

      <LegalSection id="tai-khoan" index={2} title="Tài khoản người dùng">
        <ul>
          <li>Bạn phải đủ 18 tuổi hoặc có sự đồng ý của người giám hộ hợp pháp để sử dụng Dịch vụ.</li>
          <li>
            Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và toàn bộ hoạt động phát sinh từ tài
            khoản của mình.
          </li>
          <li>
            Thông tin đăng ký phải chính xác, đầy đủ và được cập nhật khi có thay đổi.
          </li>
          <li>
            Mỗi cá nhân/tổ chức chỉ nên sử dụng một tài khoản trừ khi có thỏa thuận riêng với chúng tôi.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="dich-vu" index={3} title="Mô tả dịch vụ">
        <p>
          Dịch vụ cung cấp công cụ tạo video AI từ văn bản, hình ảnh và giọng đọc, bao gồm engine
          video và các mô hình tạo ảnh, giọng nói AI. Hệ thống tự động lựa chọn mô hình phù hợp cho
          từng tác vụ nhằm tối ưu chất lượng và chi phí.
        </p>
        <p>
          Chúng tôi có thể bổ sung, thay đổi hoặc ngừng một số tính năng, mô hình hoặc nhà cung cấp AI
          bất kỳ lúc nào để cải thiện Dịch vụ. Chất lượng, thời gian xử lý và kết quả đầu ra có thể
          thay đổi tùy theo tải hệ thống và nhà cung cấp AI bên thứ ba.
        </p>
      </LegalSection>

      <LegalSection id="credit-thanh-toan" index={4} title="Credit & thanh toán">
        <ul>
          <li>Dịch vụ hoạt động theo cơ chế trả phí quy đổi ra <strong>credit</strong>.</li>
          <li>
            Mỗi lần tạo video (render) sẽ tạm giữ và trừ credit tương ứng theo bảng giá hiển thị tại
            thời điểm sử dụng.
          </li>
          <li>
            Chi tiết về nạp, sử dụng và hoàn credit được quy định tại{" "}
            <a href="/chinh-sach-hoan-tien">Chính sách hoàn tiền &amp; credit</a>.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="hanh-vi-cam" index={5} title="Nội dung & hành vi bị cấm">
        <p>Bạn cam kết KHÔNG sử dụng Dịch vụ để tạo, tải lên hoặc phát tán nội dung:</p>
        <ul>
          <li>
            <strong>Khiêu dâm, đồi trụy (NSFW)</strong>, nội dung tình dục, đặc biệt là bất kỳ nội
            dung nào liên quan đến trẻ vị thành niên.
          </li>
          <li>
            <strong>Deepfake</strong> hoặc giả mạo hình ảnh, giọng nói của người thật mà không có sự
            đồng ý, nhằm lừa đảo, bôi nhọ hoặc gây hiểu lầm.
          </li>
          <li>
            <strong>Bôi nhọ, vu khống, quấy rối, đe dọa</strong> hoặc xâm phạm danh dự, nhân phẩm,
            đời tư của cá nhân, tổ chức.
          </li>
          <li>
            <strong>Vi phạm bản quyền, sở hữu trí tuệ</strong> hoặc nhãn hiệu của bên thứ ba mà bạn
            không có quyền sử dụng.
          </li>
          <li>
            Kích động bạo lực, thù hận, phân biệt chủng tộc/tôn giáo/giới tính, khủng bố hoặc vi phạm
            pháp luật Việt Nam.
          </li>
          <li>
            Thông tin sai sự thật gây hại, lừa đảo tài chính, phần mềm độc hại hoặc xâm phạm an ninh
            hệ thống.
          </li>
        </ul>
        <LegalCallout>
          Chúng tôi áp dụng cơ chế kiểm duyệt tự động và thủ công. Nội dung vi phạm có thể bị chặn,
          gỡ bỏ và tài khoản liên quan có thể bị đình chỉ mà không hoàn credit đã sử dụng cho nội dung
          vi phạm.
        </LegalCallout>
      </LegalSection>

      <LegalSection id="so-huu-ban-quyen" index={6} title="Quyền sở hữu & giấy phép nội dung">
        <p>
          <strong>Nội dung bạn tạo ra:</strong> Trong phạm vi pháp luật cho phép, bạn giữ quyền sử
          dụng đối với video, hình ảnh và âm thanh mà bạn tạo hợp pháp thông qua Dịch vụ, bao gồm sử
          dụng cho mục đích thương mại, phù hợp với gói dịch vụ bạn đăng ký.
        </p>
        <p>
          <strong>Nội dung đầu vào:</strong> Bạn cam kết mình có đầy đủ quyền đối với văn bản, hình
          ảnh, âm thanh và tài liệu tham chiếu mà bạn cung cấp cho Dịch vụ.
        </p>
        <p>
          <strong>Giấy phép cho chúng tôi:</strong> Bạn cấp cho chúng tôi giấy phép hạn chế, không độc
          quyền để lưu trữ, xử lý và truyền tải nội dung của bạn nhằm mục đích vận hành, cung cấp và
          cải thiện Dịch vụ. Chúng tôi không sở hữu nội dung của bạn.
        </p>
        <p>
          <strong>Nền tảng &amp; thương hiệu:</strong> Toàn bộ mã nguồn, giao diện, thương hiệu và
          công nghệ của Wavise Studio thuộc sở hữu của chúng tôi và được pháp luật bảo hộ.
        </p>
      </LegalSection>

      <LegalSection id="trach-nhiem-ai" index={7} title="Nội dung do AI tạo & trách nhiệm">
        <ul>
          <li>
            Nội dung do AI tạo có thể chứa sai sót, không chính xác hoặc không phù hợp kỳ vọng. Bạn có
            trách nhiệm kiểm tra, chỉnh sửa và chịu trách nhiệm về nội dung trước khi công bố.
          </li>
          <li>
            Bạn chịu hoàn toàn trách nhiệm pháp lý đối với cách bạn sử dụng, phân phối và khai thác nội
            dung tạo ra từ Dịch vụ.
          </li>
          <li>
            Chúng tôi không đảm bảo nội dung AI tạo ra là duy nhất, không trùng lặp hoặc không xâm phạm
            quyền của bên thứ ba.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="gioi-han-trach-nhiem" index={8} title="Giới hạn trách nhiệm">
        <p>
          Dịch vụ được cung cấp trên cơ sở “nguyên trạng” (as-is) và “theo khả năng sẵn có” (as
          available). Trong phạm vi tối đa pháp luật cho phép:
        </p>
        <ul>
          <li>
            Chúng tôi không chịu trách nhiệm cho các thiệt hại gián tiếp, ngẫu nhiên, hậu quả hoặc mất
            lợi nhuận, dữ liệu phát sinh từ việc sử dụng hoặc không thể sử dụng Dịch vụ.
          </li>
          <li>
            Chúng tôi không chịu trách nhiệm cho sự cố, gián đoạn hoặc thay đổi từ các nhà cung cấp AI
            và cổng thanh toán bên thứ ba.
          </li>
          <li>
            Tổng trách nhiệm của chúng tôi (nếu có) không vượt quá số tiền bạn đã thanh toán cho Dịch
            vụ trong 3 tháng gần nhất trước sự kiện phát sinh khiếu nại.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="cham-dut" index={9} title="Đình chỉ & chấm dứt tài khoản">
        <ul>
          <li>
            Chúng tôi có quyền đình chỉ hoặc chấm dứt tài khoản nếu bạn vi phạm Điều khoản này, đặc
            biệt là các hành vi bị cấm tại mục 5.
          </li>
          <li>
            Bạn có thể ngừng sử dụng và yêu cầu xóa tài khoản bất kỳ lúc nào qua{" "}
            <strong>[EMAIL HỖ TRỢ]</strong>.
          </li>
          <li>
            Khi tài khoản bị chấm dứt do vi phạm, credit và quyền lợi liên quan có thể bị mất mà không
            được hoàn lại, trừ trường hợp pháp luật quy định khác.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="thay-doi" index={10} title="Thay đổi điều khoản">
        <p>
          Chúng tôi có thể cập nhật Điều khoản này theo thời gian. Các thay đổi quan trọng sẽ được
          thông báo qua email hoặc trên nền tảng. Việc bạn tiếp tục sử dụng Dịch vụ sau khi thay đổi
          có hiệu lực đồng nghĩa với việc bạn chấp nhận điều khoản cập nhật.
        </p>
      </LegalSection>

      <LegalSection id="lien-he" index={11} title="Luật áp dụng & liên hệ">
        <p>
          Điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Mọi tranh chấp sẽ được ưu tiên giải
          quyết thông qua thương lượng; nếu không thành, sẽ được đưa ra cơ quan có thẩm quyền tại Việt
          Nam.
        </p>
        <p>
          Liên hệ hỗ trợ: <strong>[EMAIL HỖ TRỢ]</strong> — Điện thoại:{" "}
          <strong>[SỐ ĐIỆN THOẠI]</strong> — Đơn vị vận hành: <strong>[TÊN CÔNG TY]</strong>,{" "}
          <strong>[ĐỊA CHỈ]</strong>.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
