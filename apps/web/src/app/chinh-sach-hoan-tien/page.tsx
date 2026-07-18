import type { Metadata } from "next";
import { LegalLayout, LegalSection, LegalCallout } from "@/components/legal/legal-layout";

export const metadata: Metadata = {
  title: "Chính sách hoàn tiền & credit",
  description:
    "Chính sách hoàn tiền và credit của Wavise Studio — cách nạp, sử dụng và hoàn credit khi render thất bại.",
  robots: { index: true, follow: true },
};

const toc = [
  { id: "tong-quan", label: "1. Tổng quan cơ chế credit" },
  { id: "nap-credit", label: "2. Nạp tiền & quy đổi credit" },
  { id: "su-dung", label: "3. Cách credit được sử dụng" },
  { id: "hoan-that-bai", label: "4. Tự động hoàn credit khi thất bại" },
  { id: "khong-hoan", label: "5. Trường hợp không hoàn credit" },
  { id: "khong-hoan-tien-mat", label: "6. Không hoàn tiền mặt" },
  { id: "khieu-nai", label: "7. Khiếu nại & xử lý ngoại lệ" },
  { id: "lien-he", label: "8. Liên hệ" },
];

export default function RefundPolicyPage() {
  return (
    <LegalLayout
      title="Chính sách hoàn tiền & credit"
      intro="Chính sách này giải thích cách hệ thống credit của Wavise Studio hoạt động: nạp tiền quy đổi ra credit, cách credit được sử dụng khi tạo video, và cơ chế tự động hoàn credit khi render thất bại."
      effectiveDate="[NGÀY HIỆU LỰC]"
      toc={toc}
    >
      <LegalCallout>
        <strong>Bản nháp cần rà soát pháp lý.</strong> Nội dung mô tả đúng cơ chế credit hiện tại của
        hệ thống. Chủ sở hữu cần điền thông tin trong ngoặc vuông và rà soát pháp lý trước khi công
        bố.
      </LegalCallout>

      <LegalSection id="tong-quan" index={1} title="Tổng quan cơ chế credit">
        <p>
          Wavise Studio hoạt động theo mô hình trả phí quy đổi ra <strong>credit</strong> (đơn vị sử
          dụng nội bộ). Bạn nạp tiền để nhận credit, sau đó dùng credit để tạo video và các nội dung
          AI khác. Credit không phải tiền mặt và không thể rút hoặc chuyển đổi ngược thành tiền mặt.
        </p>
      </LegalSection>

      <LegalSection id="nap-credit" index={2} title="Nạp tiền & quy đổi credit">
        <ul>
          <li>
            Khi bạn nạp tiền, hệ thống quy đổi số tiền (VND) thành credit theo tỷ giá quy đổi hiển thị
            tại thời điểm giao dịch.
          </li>
          <li>
            Credit được cộng vào số dư tài khoản của bạn ngay sau khi thanh toán thành công và có thể
            sử dụng ngay.
          </li>
          <li>
            Giá và tỷ giá quy đổi có thể thay đổi theo thời gian; credit đã nạp không bị ảnh hưởng bởi
            thay đổi giá sau đó.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="su-dung" index={3} title="Cách credit được sử dụng">
        <p>Khi bạn tạo video (render), hệ thống xử lý credit theo các bước:</p>
        <ol>
          <li>
            <strong>Tạm giữ (reserve):</strong> Khi bắt đầu tác vụ, hệ thống tạm trừ số credit tương
            ứng với chi phí ước tính khỏi số dư của bạn.
          </li>
          <li>
            <strong>Ghi nhận khi thành công (capture):</strong> Nếu render hoàn tất thành công, số
            credit tạm giữ được ghi nhận là đã sử dụng chính thức.
          </li>
          <li>
            <strong>Hoàn lại khi thất bại (release):</strong> Nếu render thất bại, số credit tạm giữ
            được tự động hoàn trả vào số dư của bạn.
          </li>
        </ol>
        <p>Chi phí credit cho mỗi tác vụ được hiển thị minh bạch trước khi bạn xác nhận tạo video.</p>
      </LegalSection>

      <LegalSection id="hoan-that-bai" index={4} title="Tự động hoàn credit khi thất bại">
        <LegalCallout>
          Khi một tác vụ render <strong>thất bại</strong> do lỗi hệ thống hoặc lỗi từ nhà cung cấp AI,
          hệ thống sẽ <strong>tự động hoàn lại toàn bộ credit</strong> đã tạm giữ cho tác vụ đó vào số
          dư tài khoản của bạn. Bạn sẽ nhận được thông báo/email xác nhận hoàn credit.
        </LegalCallout>
        <ul>
          <li>Việc hoàn credit diễn ra tự động, bạn không cần thao tác thủ công.</li>
          <li>
            Credit được hoàn về đúng số dư credit — <strong>không</strong> hoàn dưới dạng tiền mặt.
          </li>
          <li>
            Nếu bạn cho rằng một tác vụ thất bại nhưng chưa được hoàn credit, vui lòng liên hệ hỗ trợ
            (mục 7).
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="khong-hoan" index={5} title="Trường hợp không hoàn credit">
        <p>Credit sẽ KHÔNG được hoàn trong các trường hợp sau:</p>
        <ul>
          <li>
            <strong>Render thành công:</strong> Credit đã dùng cho một tác vụ hoàn tất thành công sẽ
            không được hoàn, kể cả khi kết quả không đúng kỳ vọng chủ quan của bạn (nội dung AI mang
            tính tương đối).
          </li>
          <li>
            Nội dung bị chặn hoặc gỡ do vi phạm{" "}
            <a href="/dieu-khoan-dich-vu">Điều khoản dịch vụ</a> (ví dụ nội dung bị cấm).
          </li>
          <li>Tài khoản bị đình chỉ hoặc chấm dứt do vi phạm điều khoản.</li>
        </ul>
      </LegalSection>

      <LegalSection id="khong-hoan-tien-mat" index={6} title="Không hoàn tiền mặt">
        <LegalCallout>
          Trừ trường hợp pháp luật bắt buộc, Wavise Studio <strong>không hoàn tiền mặt</strong> cho
          credit đã nạp hoặc đã sử dụng. Mọi khoản hoàn (khi đủ điều kiện) được thực hiện dưới dạng
          credit vào tài khoản.
        </LegalCallout>
        <p>
          Trong các trường hợp mà pháp luật Việt Nam về bảo vệ quyền lợi người tiêu dùng bắt buộc phải
          hoàn tiền, chúng tôi sẽ tuân thủ theo đúng quy định pháp luật hiện hành.
        </p>
      </LegalSection>

      <LegalSection id="khieu-nai" index={7} title="Khiếu nại & xử lý ngoại lệ">
        <p>
          Nếu bạn gặp sự cố về credit, thanh toán hoặc cho rằng credit bị trừ sai, vui lòng liên hệ
          trong vòng <strong>[SỐ NGÀY]</strong> ngày kể từ khi phát sinh, kèm theo mã tác vụ/giao dịch
          liên quan. Chúng tôi sẽ xem xét và phản hồi trong thời gian hợp lý. Với các sự cố do lỗi hệ
          thống, chúng tôi có thể cấp lại credit tương ứng như một biện pháp khắc phục.
        </p>
      </LegalSection>

      <LegalSection id="lien-he" index={8} title="Liên hệ">
        <p>
          Bộ phận hỗ trợ: <strong>[EMAIL HỖ TRỢ]</strong> — Điện thoại:{" "}
          <strong>[SỐ ĐIỆN THOẠI]</strong> — Đơn vị vận hành: <strong>[TÊN CÔNG TY]</strong>, mã số
          thuế <strong>[MÃ SỐ THUẾ]</strong>, <strong>[ĐỊA CHỈ]</strong>.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
