#!/usr/bin/env bash
# scripts/backup.sh — Sao lưu / khôi phục database production (MySQL)
#
# Tại sao: dữ liệu quan hệ (user, credit, giao dịch, project) là thứ KHÔNG thể
# tái tạo. Media (MinIO/R2) lớn nhưng thay được; DB thì không. Script này tạo bản
# dump nhất quán, xoay vòng bản cũ, và (tuỳ chọn) đẩy offsite. Kèm lệnh restore để
# BẮT BUỘC test khôi phục — "backup chưa test = chưa có backup".
#
# Cách dùng:
#   bash scripts/backup.sh              # tạo backup DB (mặc định)
#   bash scripts/backup.sh db           # (như trên)
#   bash scripts/backup.sh restore <file.sql.gz>   # khôi phục (GHI ĐÈ DB — hỏi xác nhận)
#   bash scripts/backup.sh list         # liệt kê các bản backup hiện có
#
# Biến môi trường (đọc từ shell / backend/.env khi chạy compose):
#   BACKUP_DIR       Thư mục lưu backup       (mặc định: <root>/backups)
#   RETENTION_DAYS   Số ngày giữ bản cũ        (mặc định: 7)
#   COMPOSE_FILE     File compose prod         (mặc định: backend/docker-compose.yml)
#   RCLONE_REMOTE    Đích offsite cho rclone   (vd: r2:apaiplatform-backups) — bỏ trống = không đẩy offsite
# -------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
source "$ROOT/scripts/lib/common.sh"

BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT/backend/docker-compose.yml}"
RCLONE_REMOTE="${RCLONE_REMOTE:-}"
DATE_TAG="$(date +%Y%m%d-%H%M%S)"

# mysqldump chạy TRONG container mysql và đọc mật khẩu từ env của chính container
# (MYSQL_ROOT_PASSWORD / MYSQL_DATABASE) → không lộ mật khẩu ra process list của host.
compose_mysql() {
  docker compose -f "$COMPOSE_FILE" exec -T mysql "$@"
}

ensure_db_up() {
  if ! docker compose -f "$COMPOSE_FILE" ps --status running 2>/dev/null | grep -q mysql; then
    log_fail "Service 'mysql' chưa chạy (compose: $COMPOSE_FILE). Khởi động stack trước khi backup."
  fi
}

cmd_db() {
  print_header "Backup DB — $DATE_TAG"
  ensure_db_up
  mkdir -p "$BACKUP_DIR"

  local out="$BACKUP_DIR/db-${DATE_TAG}.sql.gz"
  log_time "Đang dump MySQL → $out"

  # --single-transaction: nhất quán InnoDB không khoá bảng.
  # --routines --triggers --events: đầy đủ schema logic.
  if compose_mysql sh -c \
      'exec mysqldump --single-transaction --quick --routines --triggers --events \
        -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' \
      | gzip -c > "$out"; then
    # Kiểm tra dump không rỗng và kết thúc hợp lệ.
    if [ ! -s "$out" ] || ! gzip -t "$out" 2>/dev/null; then
      rm -f "$out"
      log_fail "Dump lỗi/rỗng — đã xoá file hỏng. Kiểm tra MYSQL_ROOT_PASSWORD / MYSQL_DATABASE."
    fi
    local size; size="$(du -h "$out" | cut -f1)"
    log_info "Backup xong: $out ($size)"
  else
    rm -f "$out"
    log_fail "mysqldump thất bại."
  fi

  # Xoay vòng: xoá bản cũ hơn RETENTION_DAYS.
  log_time "Dọn bản cũ hơn ${RETENTION_DAYS} ngày trong $BACKUP_DIR"
  find "$BACKUP_DIR" -name 'db-*.sql.gz' -type f -mtime "+${RETENTION_DAYS}" -print -delete || true

  # Offsite (tuỳ chọn) — cần rclone đã cấu hình remote.
  if [ -n "$RCLONE_REMOTE" ]; then
    if command -v rclone >/dev/null 2>&1; then
      log_time "Đẩy offsite → $RCLONE_REMOTE"
      rclone copy "$out" "$RCLONE_REMOTE" && log_info "Đã đẩy offsite."
    else
      log_warn "RCLONE_REMOTE đặt nhưng chưa cài rclone — bỏ qua bước offsite."
    fi
  else
    log_warn "RCLONE_REMOTE trống — backup chỉ nằm cục bộ. Đặt RCLONE_REMOTE để có bản offsite."
  fi

  print_success "Hoàn tất backup."
}

cmd_list() {
  print_header "Danh sách backup"
  if [ -d "$BACKUP_DIR" ] && ls "$BACKUP_DIR"/db-*.sql.gz >/dev/null 2>&1; then
    ls -lh "$BACKUP_DIR"/db-*.sql.gz
  else
    log_warn "Chưa có backup nào trong $BACKUP_DIR"
  fi
}

cmd_restore() {
  local file="${1:-}"
  [ -z "$file" ] && log_fail "Thiếu file. Dùng: bash scripts/backup.sh restore <file.sql.gz>"
  [ -f "$file" ] || log_fail "Không thấy file: $file"
  gzip -t "$file" 2>/dev/null || log_fail "File không phải gzip hợp lệ: $file"

  print_header "RESTORE DB (GHI ĐÈ)"
  ensure_db_up
  print_warning "Thao tác này SẼ GHI ĐÈ database hiện tại bằng nội dung của: $file"
  print_warning "Chỉ dùng khi test khôi phục hoặc khắc phục sự cố. KHÔNG chạy trên DB thật đang có user hoạt động."
  prompt "Bạn chắc chắn muốn khôi phục?"

  log_time "Đang khôi phục từ $file ..."
  if gunzip -c "$file" | compose_mysql sh -c \
      'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'; then
    print_success "Khôi phục xong. Kiểm tra dữ liệu + chạy 'php artisan migrate --force' nếu schema mới hơn."
  else
    log_fail "Khôi phục thất bại."
  fi
}

main() {
  local sub="${1:-db}"
  case "$sub" in
    db|"")   cmd_db ;;
    list)    cmd_list ;;
    restore) shift; cmd_restore "$@" ;;
    *)       log_fail "Lệnh không hợp lệ: $sub (dùng: db | list | restore <file>)" ;;
  esac
}

main "$@"
