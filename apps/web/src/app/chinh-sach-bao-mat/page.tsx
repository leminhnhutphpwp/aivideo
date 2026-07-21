import type { Metadata } from "next";
import { LegalLayout, LegalSection, LegalCallout } from "@/components/legal/legal-layout";

export const metadata: Metadata = {
  title: "Chính sách bảo mật",
  description:
    "Chính sách bảo mật của Wavise Studio — cách chúng tôi thu thập, sử dụng và bảo vệ dữ liệu của bạn.",
  // Draft with placeholder company/contact data → keep out of the index until
  // filled. Still crawlable (follow) so the footer links aren't dead ends.
  robots: { index: false, follow: true },
  alternates: { canonical: "/chinh-sach-bao-mat" },
};

const toc = [
  { id: "tong-quan", label: "1. Tổng quan" },
  { id: "du-lieu-thu-thap", label: "2. Dữ liệu chúng tôi thu thập" },
  { id: "muc-dich", label: "3. Mục đích sử dụng dữ liệu" },
  { id: "luu-tru", label: "4. Lưu trữ & bảo mật dữ liệu" },
  { id: "ben-thu-ba", label: "5. Chia sẻ với bên thứ ba" },
  { id: "cookie", label: "6. Cookie & công nghệ theo dõi" },
  { id: "quyen-nguoi-dung", label: "7. Quyền của người dùng" },
  { id: "tre-em", label: "8. Quyền riêng tư trẻ em" },
  { id: "thay-doi", label: "9. Thay đổi chính sách" },
  { id: "lien-he", label: "10. Liên hệ" },
];

export default function PrivacyPolicyPage() {
  {/* TODO(owner): fill real company/contact/tax/effective-date data, then re-enable index + re-add to sitemap */}
  return (
    <LegalLayout
      title="Chính sách bảo mật"
      intro="Chính sách này mô tả cách Wavise Studio thu thập, sử dụng, lưu trữ và bảo vệ dữ liệu cá nhân của bạn khi sử dụng nền tảng tạo video AI của chúng tôi."
      effectiveDate="[NGÀY HIỆU LỰC]"
      toc={toc}
    >
      <LegalCallout>
        <strong>Bản nháp cần rà soát pháp lý.</strong> Tài liệu này là bản mẫu để chủ sở hữu điền
        thông tin và tham vấn luật sư trước khi công bố. Các mục trong ngoặc vuông in hoa cần được
        thay bằng thông tin thực tế.
      </LegalCallout>

      <LegalSection id="tong-quan" index={1} title="Tổng quan">
        <p>
          Wavise Studio được vận hành bởi <strong>[TÊN CÔNG TY]</strong>, mã số thuế{" "}
          <strong>[MÃ SỐ THUẾ]</strong>, địa chỉ <strong>[ĐỊA CHỈ]</strong>. Chúng tôi tôn trọng
          quyền riêng tư của bạn và cam kết bảo vệ dữ liệu cá nhân theo pháp luật Việt Nam, bao gồm
          Nghị định về bảo vệ dữ liệu cá nhân hiện hành.
        </p>
      </LegalSection>

      <LegalSection id="du-lieu-thu-thap" index={2} title="Dữ liệu chúng tôi thu thập">
        <p>Chúng tôi thu thập các loại dữ liệu sau:</p>
        <ul>
          <li>
            <strong>Thông tin tài khoản:</strong> tên, địa chỉ email, mật khẩu (được mã hóa), ảnh đại
            diện (nếu có).
          </li>
          <li>
            <strong>Thông tin đăng nhập bên thứ ba:</strong> khi bạn đăng nhập bằng Google, chúng tôi
            nhận tên và email từ tài khoản Google của bạn.
          </li>
          <li>
            <strong>Thông tin thanh toán:</strong> lịch sử giao dịch nạp credit và gói dịch vụ. Thông
            tin thẻ/tài khoản được xử lý bởi cổng thanh toán bên thứ ba — chúng tôi không lưu trữ số
            thẻ đầy đủ.
          </li>
          <li>
            <strong>Nội dung bạn tạo:</strong> văn bản mô tả (prompt), hình ảnh/âm thanh tải lên, và
            video, hình ảnh, giọng đọc do bạn tạo ra trên nền tảng.
          </li>
          <li>
            <strong>Dữ liệu kỹ thuật:</strong> địa chỉ IP, loại trình duyệt, thiết bị, nhật ký hoạt
            động và dữ liệu sử dụng nhằm vận hành và bảo mật Dịch vụ.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="muc-dich" index={3} title="Mục đích sử dụng dữ liệu">
        <ul>
          <li>Cung cấp, vận hành và duy trì Dịch vụ tạo video AI.</li>
          <li>Xử lý thanh toán, quản lý credit và gói dịch vụ của bạn.</li>
          <li>Gửi email giao dịch (xác minh, hóa đơn, thông báo hoàn credit, hỗ trợ).</li>
          <li>Kiểm duyệt nội dung, phát hiện gian lận và bảo đảm an toàn hệ thống.</li>
          <li>Cải thiện chất lượng sản phẩm, phân tích hiệu suất và trải nghiệm người dùng.</li>
          <li>Tuân thủ nghĩa vụ pháp lý khi được cơ quan có thẩm quyền yêu cầu hợp pháp.</li>
        </ul>
        <p>
          Chúng tôi <strong>không</strong> bán dữ liệu cá nhân của bạn cho bên thứ ba vì mục đích
          quảng cáo.
        </p>
      </LegalSection>

      <LegalSection id="luu-tru" index={4} title="Lưu trữ & bảo mật dữ liệu">
        <p>
          Dữ liệu được lưu trữ trên hạ tầng đám mây và dịch vụ lưu trữ đối tượng (object storage) an
          toàn. Chúng tôi áp dụng các biện pháp bảo mật hợp lý như mã hóa mật khẩu, kiểm soát truy cập
          và truyền dữ liệu qua kết nối được mã hóa (HTTPS).
        </p>
        <p>
          Dữ liệu được lưu trong thời gian tài khoản của bạn còn hoạt động và trong khoảng thời gian
          cần thiết để tuân thủ pháp luật. Bạn có thể yêu cầu xóa dữ liệu theo mục 7.
        </p>
      </LegalSection>

      <LegalSection id="ben-thu-ba" index={5} title="Chia sẻ với bên thứ ba">
        <p>Để cung cấp Dịch vụ, chúng tôi chia sẻ dữ liệu cần thiết với các bên xử lý sau:</p>
        <ul>
          <li>
            <strong>Nhà cung cấp mô hình AI:</strong> prompt và tài liệu tham chiếu của bạn được gửi
            đến nhà cung cấp AI (ví dụ engine video Qwen/Wan cùng các mô hình ảnh và giọng nói) để tạo
            nội dung.
          </li>
          <li>
            <strong>Cổng thanh toán:</strong> thông tin giao dịch được xử lý bởi đối tác thanh toán để
            hoàn tất việc nạp credit.
          </li>
          <li>
            <strong>Hạ tầng &amp; lưu trữ đám mây:</strong> nhà cung cấp máy chủ và lưu trữ để vận hành
            nền tảng.
          </li>
          <li>
            <strong>Dịch vụ email:</strong> gửi email giao dịch và thông báo hệ thống.
          </li>
        </ul>
        <p>
          Các bên thứ ba chỉ được truy cập dữ liệu trong phạm vi cần thiết để cung cấp dịch vụ cho
          chúng tôi và có nghĩa vụ bảo mật tương ứng.
        </p>
      </LegalSection>

      <LegalSection id="cookie" index={6} title="Cookie & công nghệ theo dõi">
        <p>
          Chúng tôi sử dụng cookie và công nghệ tương tự để duy trì phiên đăng nhập, ghi nhớ tùy chọn
          và phân tích lưu lượng nhằm cải thiện Dịch vụ. Bạn có thể quản lý hoặc chặn cookie qua cài
          đặt trình duyệt, tuy nhiên một số tính năng có thể không hoạt động đầy đủ.
        </p>
      </LegalSection>

      <LegalSection id="quyen-nguoi-dung" index={7} title="Quyền của người dùng">
        <p>Trong phạm vi pháp luật, bạn có các quyền sau đối với dữ liệu cá nhân của mình:</p>
        <ul>
          <li>Quyền truy cập và yêu cầu bản sao dữ liệu.</li>
          <li>Quyền chỉnh sửa, cập nhật thông tin không chính xác.</li>
          <li>Quyền yêu cầu xóa tài khoản và dữ liệu cá nhân.</li>
          <li>Quyền phản đối hoặc hạn chế một số hoạt động xử lý dữ liệu.</li>
          <li>Quyền rút lại sự đồng ý đã cung cấp trước đó.</li>
        </ul>
        <p>
          Để thực hiện các quyền trên, vui lòng liên hệ <strong>[EMAIL HỖ TRỢ]</strong>. Chúng tôi sẽ
          phản hồi trong thời hạn hợp lý theo quy định pháp luật.
        </p>
      </LegalSection>

      <LegalSection id="tre-em" index={8} title="Quyền riêng tư trẻ em">
        <p>
          Dịch vụ không dành cho người dưới 18 tuổi mà không có sự đồng ý của người giám hộ hợp pháp.
          Nếu phát hiện đã thu thập dữ liệu của trẻ em không đúng quy định, chúng tôi sẽ xóa dữ liệu
          đó trong thời gian sớm nhất.
        </p>
      </LegalSection>

      <LegalSection id="thay-doi" index={9} title="Thay đổi chính sách">
        <p>
          Chúng tôi có thể cập nhật Chính sách bảo mật này theo thời gian. Bản cập nhật sẽ được đăng
          tải trên trang này kèm ngày hiệu lực mới. Vui lòng kiểm tra định kỳ để nắm được thay đổi.
        </p>
      </LegalSection>

      <LegalSection id="lien-he" index={10} title="Liên hệ">
        <p>
          Mọi câu hỏi về quyền riêng tư, vui lòng liên hệ: <strong>[EMAIL HỖ TRỢ]</strong> — Điện
          thoại: <strong>[SỐ ĐIỆN THOẠI]</strong> — Đơn vị vận hành: <strong>[TÊN CÔNG TY]</strong>,{" "}
          <strong>[ĐỊA CHỈ]</strong>.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
